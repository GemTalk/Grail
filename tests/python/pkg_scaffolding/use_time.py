import time


def get_time():
    return time.time()


def get_time_ns():
    return time.time_ns()


def get_monotonic():
    return time.monotonic()


def measure_sleep(secs):
    t0 = time.monotonic()
    time.sleep(secs)
    t1 = time.monotonic()
    return t1 - t0


def get_gmtime():
    return time.gmtime()


def get_gmtime_of(secs):
    return time.gmtime(secs)


def format_gmtime(secs, fmt):
    return time.strftime(fmt, time.gmtime(secs))


def asctime_of(secs):
    return time.asctime(time.gmtime(secs))


def roundtrip_localtime(secs):
    # mktime ∘ localtime should approximate the original (modulo isdst).
    t = time.localtime(secs)
    return time.mktime(t)
