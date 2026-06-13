# Fixture for BuiltinExtrasTestCase.testVarsOnInstance — a plain class
# whose instances carry dynamic attributes for vars() to harvest.


class Config:
    def __init__(self):
        self.host = "localhost"
        self.port = 8080


def vars_facts():
    c = Config()
    d = vars(c)
    return (d["host"] == "localhost" and d["port"] == 8080
            and isinstance(d, dict))


def vars_zero_arg_is_locals():
    alpha = 1
    beta = "two"
    d = vars()
    # d itself is unbound at the vars() call moment, so it is absent —
    # the same snapshot semantics as locals().
    return d == {"alpha": 1, "beta": "two"}
