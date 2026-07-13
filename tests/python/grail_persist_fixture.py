# Fixture for the cross-session persistence experiment (scratchpad script
# scripts scratchpad/persist_experiment.gs).  Defines a user class with a
# method, class-body annotations, and a method annotation, plus a module-
# level instance.  Session 1 commits the instance; session 2 (fresh login)
# reads it back and checks whether the committed object still carries the
# full behavior defined here.

class Widget:
    kind: str
    size: int = 3

    def describe(self) -> str:
        return "widget-" + str(self.size)


widget = Widget()
