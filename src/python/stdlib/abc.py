# Minimal ``abc`` for Grail — enough for libraries that decorate
# methods with @abstractmethod and subclass ABC.  No metaclass
# enforcement: instantiating an "abstract" class is not blocked
# (CPython raises TypeError); abstract methods typically raise
# NotImplementedError in their bodies anyway, which twilio's
# AuthStrategy / CredentialProvider do.


def abstractmethod(funcobj):
    """Mark funcobj abstract.  Identity decorator in Grail (no
    metaclass enforcement); the __isabstractmethod__ stamp matches
    CPython for introspection."""
    try:
        funcobj.__isabstractmethod__ = True
    except (AttributeError, TypeError):
        pass
    return funcobj


class ABC:
    """Inherit-from-me marker; no instantiation enforcement.

    Upstream writes this ``class ABC(metaclass=ABCMeta)``, and since Grail
    now honours that keyword the same spelling would work here -- every
    ``class Foo(ABC)`` would inherit ABCMeta and gain register().  It is
    deliberately NOT spelled that way yet: ABC is a base for a great many
    classes, and routing all of their isinstance/issubclass misses through
    ABCMeta's Python-level __instancecheck__ is a performance and semantic
    change worth measuring on its own rather than smuggling in alongside
    the mechanism.  Classes that need registration can name ABCMeta
    directly, which is what CPython's own code does.
    """
    pass


# The virtual-subclass registry, keyed by the ABC itself.  CPython keeps
# this per-class in ``cls._abc_registry``; a Grail class object cannot
# carry dynamic instance variables, so the map lives here.  Keyed by
# class IDENTITY rather than by ``cls.__name__`` -- two unrelated ABCs
# named ``B`` are a normal thing in test code, and a name key silently
# merges their registrations.
_registry = {}


class ABCMeta:
    """Metaclass for abstract base classes.

    GRAIL: upstream subclasses ``type`` and creates the class; Grail has no
    metaclass object to route class creation through, so ``class C(...,
    metaclass=ABCMeta)`` RECORDS ABCMeta (object >> ___grailSetMetaclass___)
    and attribute lookup on C consults it -- CPython's ``type(cls).__mro__''
    step, reached by a different road.  The methods below are therefore
    written exactly as CPython writes them, taking the USING class as
    ``cls``, and that is what they receive.

    What this does NOT do is enforce abstractness: instantiating a class
    with unimplemented abstract methods is allowed (CPython raises
    TypeError).  Abstract bodies raise NotImplementedError of their own
    accord, which is the behaviour that matters in practice.

    collections.abc keeps its own copy of this protocol (_ABCRoot) because
    it needs two things this cannot have: a builtin whitelist mapping ABC
    names onto Smalltalk classes, and structural __subclasshook__ probes.
    Those are specific to the standard ABCs; this is the general article.
    """

    def register(cls, subclass):
        """Register subclass as a VIRTUAL subclass of cls.

        Returns the argument, so it also works as a class decorator."""
        if not isinstance(subclass, type):
            raise TypeError("Can only register classes")
        if issubclass(subclass, cls):
            return subclass  # already a subclass; nothing to record
        # Guard against the inversion CPython rejects: registering a class
        # that cls itself already descends from would make the two mutually
        # subclasses of one another.
        if issubclass(cls, subclass):
            raise RuntimeError("Refusing to create an inheritance cycle")
        _registry.setdefault(cls, []).append(subclass)
        _bump_invalidation_counter()
        return subclass

    def __subclasscheck__(cls, subclass):
        """issubclass(subclass, cls).

        Grail reaches this only after the real Smalltalk chain and the C3
        MRO have both missed, so a genuine subclass never gets here and the
        registry/hook answers are all that remain."""
        hook = getattr(cls, '__subclasshook__', None)
        if hook is not None:
            ok = hook(subclass)
            if ok is not NotImplemented:
                return bool(ok)
        for registered in _registry.get(cls, ()):
            if subclass is registered or issubclass(subclass, registered):
                return True
        # A virtual subclass of a BASE of cls is not a subclass of cls, but a
        # virtual subclass registered on a class that subclasses cls is --
        # CPython walks __subclasses__ here.  Grail's equivalent is to ask
        # each class registered under a subclass of cls.
        #
        # ``cls in abc_cls.__mro__`` and not ``issubclass(abc_cls, cls)``: both
        # operands are ABCs, so issubclass would come straight back into this
        # method and recurse until the stack died.  CPython asks the same
        # question of __subclasses__, which is likewise the REAL chain only.
        for abc_cls, registered in _registry.items():
            if abc_cls is not cls and cls in abc_cls.__mro__:
                for r in registered:
                    if subclass is r or issubclass(subclass, r):
                        return True
        return False

    def __instancecheck__(cls, instance):
        """isinstance(instance, cls) -- decided by the instance's type, the
        way CPython's ABCMeta does."""
        return cls.__subclasscheck__(type(instance))


_abc_invalidation_counter = 0


def get_cache_token():
    """CPython returns an opaque token that CHANGES whenever any ABC
    registration happens.  Anything caching a decision that depends on
    issubclass() must re-check it: functools.singledispatch caches a class ->
    implementation mapping, and registering a class on an ABC can make a
    previously-cached answer wrong without touching the dispatcher at all.

    Grail's ABC machinery lives in collections.abc rather than here (there is
    no real ABCMeta), so that module bumps the counter through
    _bump_invalidation_counter() below.  Returning a constant -- which this
    did -- makes every such cache silently stale."""
    return _abc_invalidation_counter


def _bump_invalidation_counter():
    """Called by collections.abc._ABCRoot.register() on every registration."""
    global _abc_invalidation_counter
    _abc_invalidation_counter += 1
    return _abc_invalidation_counter
