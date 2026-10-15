"CPython's ``functools._singledispatchmethod_get' -- the object a
singledispatchmethod descriptor's ``__get__' answers, holding the
descriptor plus the instance and class it was read through.

Exists because the three access paths are three DIFFERENT objects in
CPython, distinguishable by repr: the descriptor itself
(``A.__dict__[""m""]'), the unbound read (``A.m'), and the bound read
(``a.m').  Grail used to answer the descriptor for both reads and a
generic MethodBinding for a bound plain method -- so ``repr(A.m)' named
a descriptor and ``type(a.m).__module__' was 'builtins' rather than
'functools'.

Metadata is FORWARDED to the descriptor rather than copied: the
descriptor already resolves __name__ / __qualname__ / __module__ /
__doc__ / __annotations__ off whatever it wraps, through the attribute
protocol, and duplicating that here would be a second thing to keep
correct.

Calling delegates to the descriptor too, prepending the instance exactly
when the descriptor says it binds one.  That keeps ONE call shape serving
plain methods, @classmethod and @staticmethod -- the property the old
___pyBindsSelf___ arrangement provided and which several tests rely on."
Class {
	#name : 'functools_singledispatchmethod_get',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}
