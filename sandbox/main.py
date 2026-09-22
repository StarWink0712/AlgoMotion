"""Trusted transport/recorder, executed ONLY in the restricted Docker image.

Python introspection is not a security boundary. The container and host-side
resource/schema checks are the boundary; generated code is always untrusted.
"""
import contextlib
import copy
import inspect
import io
import json
import resource
import sys

resource.setrlimit(resource.RLIMIT_CPU, (3, 3))
resource.setrlimit(resource.RLIMIT_FSIZE, (1048576, 1048576))
resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


class OutputLimit(BaseException):
    pass


class TraceLimit(BaseException):
    pass


class LimitedOutput(io.TextIOBase):
    def __init__(self):
        self.size = 0

    def write(self, value):
        self.size += len(value.encode("utf-8"))
        if self.size > 8192:
            raise OutputLimit()
        return len(value)

    def flush(self):
        pass


def encode(value):
    return json.dumps(value, ensure_ascii=True, allow_nan=False, separators=(",", ":"))


class Recorder:
    def __init__(self):
        self.frames = []
        self.total = 0
        self.state = dict(grid=[[None]], active=[], visited=[], blocked=[],
                          queue=[], path=[], dp=[], dependencies=[], variables={})

    def snapshot(self, action, explanation="", **state):
        if set(state) - set(self.state):
            raise ValueError("unknown snapshot field")
        self.state.update(copy.deepcopy(state))
        caller = inspect.currentframe().f_back
        if caller.f_code.co_filename != "solution.py":
            raise ValueError("snapshot must be called from solution.py")
        frame = dict(self.state, step=len(self.frames), line=caller.f_lineno,
                     action=action, explanation=explanation)
        encoded = encode(frame)
        self.total += len(encoded)
        if len(self.frames) >= 600 or self.total > 1900000:
            raise TraceLimit()
        self.frames.append(json.loads(encoded))


def main():
    output = sys.stdout
    stdout, stderr = LimitedOutput(), LimitedOutput()
    try:
        raw = sys.stdin.buffer.read(100001)
        if len(raw) > 100000:
            raise ValueError("input limit")
        payload = json.loads(raw)
        source, data = payload["python"], payload["input"]
        recorder = Recorder()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            namespace = {"__name__": "generated_solution"}
            exec(compile(source, "solution.py", "exec"), namespace)
            result = namespace["solve"](copy.deepcopy(data), recorder)
            if not recorder.frames:
                raise ValueError("no runtime snapshots")
            if len(encode(result)) > 32768:
                raise OutputLimit()
        response = dict(ok=True, frames=recorder.frames, result=result)
    except BaseException as error:
        line = None
        tb = error.__traceback__
        while tb:
            if tb.tb_frame.f_code.co_filename == "solution.py":
                line = tb.tb_lineno
            tb = tb.tb_next
        if isinstance(error, SyntaxError):
            line = error.lineno
        # No arbitrary exception text, source, paths or stdout/stderr in diagnostics.
        category = type(error).__name__
        allowed = {"OutputLimit", "TraceLimit", "SyntaxError", "ValueError", "TypeError",
                   "KeyError", "IndexError", "NameError", "ZeroDivisionError", "MemoryError",
                   "PermissionError", "OSError", "RecursionError", "ImportError"}
        response = dict(ok=False, error=dict(type=category if category in allowed else "RuntimeError", line=line))
    output.write(encode(response))
    output.flush()


if __name__ == "__main__":
    main()
