"""Generic MCP subprocess lifecycle manager.

Manages JSON-RPC 2.0 communication over stdin/stdout with any MCP server.
Not Gmail-specific — reusable for calendar, github, filesystem, etc.
"""

import json
import logging
import subprocess
import threading
import time

logger = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = 30


class MCPConnectionError(Exception):
    """Raised when the MCP subprocess cannot be reached."""


class MCPTimeoutError(Exception):
    """Raised when an MCP request exceeds the timeout."""


class MCPConnection:
    """One running MCP server subprocess with JSON-RPC communication."""

    def __init__(
        self,
        name: str,
        command: str,
        args: list[str],
        timeout: int = _DEFAULT_TIMEOUT,
    ) -> None:
        self.name = name
        self.command = command
        self.args = args
        self.timeout = timeout
        self._process: subprocess.Popen | None = None
        self._request_id = 0
        self._lock = threading.Lock()
        self._initialized = False

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Spawn the MCP subprocess."""
        if self._process and self._process.poll() is None:
            return  # already running
        logger.info("mcp.%s starting: %s %s", self.name, self.command, self.args)
        self._process = subprocess.Popen(
            [self.command, *self.args],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self._initialized = False
        self._initialize()

    def stop(self) -> None:
        """Terminate the subprocess gracefully."""
        if self._process and self._process.poll() is None:
            logger.info("mcp.%s stopping", self.name)
            try:
                self._process.terminate()
                self._process.wait(timeout=5)
            except Exception:
                self._process.kill()
        self._process = None
        self._initialized = False

    def is_running(self) -> bool:
        """Check if the subprocess is alive."""
        return self._process is not None and self._process.poll() is None

    def _restart(self) -> None:
        """Kill and restart the subprocess."""
        logger.warning("mcp.%s restarting", self.name)
        self.stop()
        self.start()

    # ------------------------------------------------------------------
    # MCP protocol initialization
    # ------------------------------------------------------------------

    def _initialize(self) -> None:
        """Send the MCP initialize handshake."""
        if self._initialized:
            return
        response = self._send_raw(
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "nexus", "version": "0.1.0"},
            },
        )
        logger.debug("mcp.%s initialized: %s", self.name, response)

        # Send initialized notification (no response expected)
        self._write_message({"jsonrpc": "2.0", "method": "notifications/initialized"})
        self._initialized = True

    # ------------------------------------------------------------------
    # JSON-RPC communication
    # ------------------------------------------------------------------

    def call(self, method: str, params: dict | None = None) -> dict:
        """Send a JSON-RPC request and return the result.

        Auto-starts the subprocess if needed. On failure, retries once
        after restarting.
        """
        if not self.is_running():
            self.start()
        try:
            return self._send_raw(method, params)
        except (BrokenPipeError, EOFError, MCPConnectionError) as exc:
            logger.warning("mcp.%s call failed (%s), retrying", self.name, exc)
            self._restart()
            return self._send_raw(method, params)

    def _send_raw(self, method: str, params: dict | None = None) -> dict:
        """Low-level JSON-RPC send/receive with timeout."""
        with self._lock:
            self._request_id += 1
            request_id = self._request_id
            message = {
                "jsonrpc": "2.0",
                "id": request_id,
                "method": method,
            }
            if params is not None:
                message["params"] = params

            self._write_message(message)
            return self._read_response(request_id)

    def _write_message(self, message: dict) -> None:
        """Write a JSON-RPC message to the subprocess stdin."""
        if not self._process or not self._process.stdin:
            raise MCPConnectionError(f"mcp.{self.name}: process not running")
        try:
            payload = json.dumps(message)
            self._process.stdin.write(payload + "\n")
            self._process.stdin.flush()
        except (BrokenPipeError, OSError) as exc:
            raise MCPConnectionError(f"mcp.{self.name}: write failed: {exc}") from exc

    def _read_response(self, request_id: int) -> dict:
        """Read lines from stdout until we get the matching response."""
        if not self._process or not self._process.stdout:
            raise MCPConnectionError(f"mcp.{self.name}: process not running")

        deadline = time.time() + self.timeout
        while time.time() < deadline:
            try:
                line = self._process.stdout.readline()
            except Exception as exc:
                raise MCPConnectionError(
                    f"mcp.{self.name}: read failed: {exc}"
                ) from exc

            if not line:
                if self._process.poll() is not None:
                    raise MCPConnectionError(
                        f"mcp.{self.name}: process exited with code {self._process.returncode}"
                    )
                continue

            line = line.strip()
            if not line:
                continue

            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                # Skip non-JSON output (e.g. npm install messages)
                continue

            # Skip notifications (no id)
            if "id" not in data:
                continue

            if data.get("id") == request_id:
                if "error" in data:
                    error = data["error"]
                    raise MCPConnectionError(
                        f"mcp.{self.name}: {error.get('message', error)}"
                    )
                return data.get("result", {})

        raise MCPTimeoutError(
            f"mcp.{self.name}: timeout after {self.timeout}s waiting for response"
        )


class MCPManager:
    """Registry of named MCP connections."""

    def __init__(self) -> None:
        self._connections: dict[str, MCPConnection] = {}

    def get_or_create(
        self,
        name: str,
        command: str,
        args: list[str],
        timeout: int = _DEFAULT_TIMEOUT,
    ) -> MCPConnection:
        """Get an existing connection or create a new one."""
        if name not in self._connections:
            self._connections[name] = MCPConnection(name, command, args, timeout)
        return self._connections[name]

    def stop_all(self) -> None:
        """Stop every managed MCP connection."""
        for conn in self._connections.values():
            conn.stop()

    def health_check(self, name: str) -> bool:
        """Check if a named connection is alive."""
        conn = self._connections.get(name)
        return conn is not None and conn.is_running()


mcp_manager = MCPManager()
