"""A runtime store on a deployed class is session-local, whichever name it uses.

`Mark.retracts = v` and `setattr(Mark, 'retracts', v)` must behave exactly like
the same stores to a name the body never declared: visible here, invisible to
every other session, and leaving nothing to commit.

They did not.  Every name a class body declares leaves a `Grail-Class Attrs`
getter/setter pair behind, `object.__setattr__` dispatched to that setter before
consulting the overlay, and the store went into the COMMITTED holder -- so two
gems configuring the same framework class conflicted on commit, and the winner's
value became the class's value for every session and for every stored instance
that had never set it (#1240).  A name the body did NOT declare has no accessor
pair, fell through to `___pyAttrStore___`, and was session-local all along.

`WithMeta` is the case the repair must NOT break: a real metaclass @property is
a data descriptor and its setter has to run, rather than being diverted into the
overlay.  Its setter doubles what it is given, so a read of 5 would mean the
overlay swallowed the store and a read of 10 means the setter ran.

Driven from tests/scripts/runClassAttrSessionLocalTest.gs, which is where the
commit / logout / login boundary this is about can be observed.
"""


class Mark:
    retracts = None
    tags = ()


class Meta(type):
    @property
    def config(cls):
        return cls._config

    @config.setter
    def config(cls, value):
        cls._config = value * 2


class WithMeta(metaclass=Meta):
    _config = 0


def store_body_name():
    Mark.retracts = "changed"


def setattr_body_name():
    setattr(Mark, "tags", ("rebound",))


def store_new_name():
    Mark.brand_new = 1


def setattr_new_name():
    setattr(Mark, "brand_new2", 2)


def store_through_metaclass_property():
    WithMeta.config = 5


def read(name):
    return getattr(Mark, name, "<absent>")


def read_config():
    return WithMeta.config


# The cross-session half of this fixture can only be observed from the .gs
# driver.  The single-process half -- every store visible, the metaclass
# setter run -- is CPython-checkable, so it opts in to check_python_fixtures.sh.
RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


if __name__ == '__main__':
    store_body_name()
    setattr_body_name()
    store_new_name()
    setattr_new_name()
    store_through_metaclass_property()
    check('a_body_name_store_is_visible', read('retracts'), 'changed')
    check('a_body_name_setattr_is_visible', read('tags'), ('rebound',))
    check('a_new_name_store_is_visible', read('brand_new'), 1)
    check('a_new_name_setattr_is_visible', read('brand_new2'), 2)
    check('the_metaclass_property_setter_ran', read_config(), 10)
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
