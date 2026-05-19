"""
A `_GemStoneModule` instance is published as `sys.modules["gemstone"]`
so user code can `import gemstone`.

Async methods route through `_request`, which parks on a future while
the GemStone side services the request via `_step`/`_resolve`/`_reject`.
"""

import sys as _sys
import asyncio as _asyncio
from dataclasses import dataclass


class _GemStoneRoot(dict):
    def __repr__(self):
        return "GemStoneRoot(" + repr(list(self.keys())) + ")"


@dataclass
class _SystemInfo:
    stone_name: str = ""
    session_id: int = 0
    needs_commit: bool = False
    session_count: int = 0


class _GemStoneModule:
    def __init__(self):
        self.root = _GemStoneRoot()
        self.system = _SystemInfo()
        self._loop = _asyncio.new_event_loop()
        self._pending_request = None
        self._future = None
        self._task = None

    async def _request(self, action, *args):
        future = self._loop.create_future()
        self._pending_request = (action, args, future)
        self._loop.stop()
        return await future

    async def commit(self):
        return await self._request("commit")

    async def abort(self):
        return await self._request("abort")

    async def smalltalk_eval(self, code):
        return await self._request("smalltalk_eval", code)

    async def python_eval(self, code):
        return await self._request("python_eval", code)

    async def system_info(self):
        info = await self._request("system_info")
        self.system.stone_name = info.get("stone_name", "")
        self.system.session_id = info.get("session_id", 0)
        self.system.needs_commit = info.get("needs_commit", False)
        self.system.session_count = info.get("session_count", 0)
        return self.system

    async def read_line(self, prompt=""):
        return await self._request("read_line", prompt)

    async def write(self, s):
        return await self._request("write", s)

    async def write_err(self, s):
        return await self._request("write_err", s)

    def _start(self, coro):
        self._task = self._loop.create_task(coro)
        self._task.add_done_callback(lambda t: self._loop.stop())

    def _step(self):
        self._loop.run_forever()
        if self._pending_request is not None:
            action, args, future = self._pending_request
            self._pending_request = None
            self._future = future
            return (action,) + args

        result = self._task.result()
        self._task = None
        return result

    def _resolve(self, value):
        self._future.set_result(value)
        self._future = None

    def _reject(self, error_msg):
        self._future.set_exception(RuntimeError(error_msg))
        self._future = None

    def __repr__(self):
        return "<gemstone module, root=" + repr(self.root) + ">"


def install():
    mod = _sys.modules.get("gemstone")
    if mod is not None:
        return mod

    instance = _GemStoneModule()
    _sys.modules["gemstone"] = instance

    return instance
