"``@functools.singledispatchmethod' -- singledispatch for a METHOD,
dispatching on the first argument AFTER the receiver.

Holds a functools_singledispatch over the decorated method (all the
registry, MRO walk and annotation inference live there) plus the method
itself, and answers ``___pyBindsSelf___' so that reading it off an
instance binds the receiver the way CPython's ``__get__' does.

Applies to a plain instance method.  The
``@singledispatchmethod @classmethod' / ``@singledispatchmethod
@staticmethod' stacks are NOT supported: Grail consumes those inner
decorators at PARSE time by re-classing the def, so by the time this
decorator runs there is no instance-side method for it to wrap."
Class {
	#name : 'functools_singledispatchmethod',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
functools_singledispatchmethod class >> ___pythonValueAttrs___ [
	"Identifying metadata copied off the wrapped method: name strings and a
	docstring, not callables.  ``__isabstractmethod__'' is a @property in
	CPython, so it too must READ as a value -- abc consults it with getattr
	and a callable would test truthy no matter what it wrapped."

	^ IdentitySet new
		add: #'__name__';
		add: #'__doc__';
		add: #'__qualname__';
		add: #'__module__';
		add: #'__annotations__';
		add: #'__isabstractmethod__';
		yourself

]
