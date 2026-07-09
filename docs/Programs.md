# Programs

## Following are some programs that we could use to test our work.

### Benchmark
There is a [Python Benchmark Suite](https://github.com/python/performance) that "is intended to be an authoritative source of benchmarks for all Python implementations." This seems like a good target for our work.

### Regression Tests
Python comes with a [regression test package](https://docs.python.org/3/library/test.html) that can be launched with `python3 -m test`. This generates a number of errors and even some crashes on macOS, so before trying to get it to run we would need to understand more about what it does and how it is expected to work. Following is the output from a CPython 3.14.4 test run on macOS 26.5.2:

```
== Tests result: FAILURE ==

28 tests skipped:
    test.test_asyncio.test_windows_events
    test.test_asyncio.test_windows_utils test.test_gdb.test_backtrace
    test.test_gdb.test_cfunction test.test_gdb.test_cfunction_full
    test.test_gdb.test_misc test.test_gdb.test_pretty_print
    test.test_multiprocessing_fork.test_manager
    test.test_multiprocessing_fork.test_misc
    test.test_multiprocessing_fork.test_processes
    test.test_multiprocessing_fork.test_threads test_android
    test_asdl_parser test_clinic test_dbm_gnu test_devpoll test_epoll
    test_free_threading test_generated_cases test_launcher test_msvcrt
    test_perf_profiler test_perfmaps test_startfile test_winapi
    test_winconsoleio test_winreg test_wmi

11 tests skipped (resource denied):
    test_curses test_peg_generator test_smtpnet test_socketserver
    test_tkinter test_ttk test_urllib2net test_urllibnet test_winsound
    test_xpickle test_zipfile64

6 tests failed:
    test_site test_ssl test_struct test_sys test_sysconfig test_venv

447 tests OK.

Total duration: 12 min 59 sec
Total tests: run=46,765 failures=15 skipped=2,395
Total test files: run=481/492 failed=6 skipped=28 resource_denied=11
Result: FAILURE
```
