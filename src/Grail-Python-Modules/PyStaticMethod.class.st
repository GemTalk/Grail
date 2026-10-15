"Python ``staticmethod(f)' -- a descriptor whose __get__ answers the wrapped
function UNBOUND, however it is reached.  Callable in its own right, as
CPython's has been since 3.10."
Class {
	#name : 'PyStaticMethod',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
PyStaticMethod class >> ___pythonValueAttrs___ [
	"``__isabstractmethod__'' is a value in CPython, and abc consults it with
	getattr -- a callable wrapper would test truthy whatever it wrapped.  The
	identity trio is forwarded from the wrapped function and is likewise a value."

	^ IdentitySet new
		add: #'__isabstractmethod__';
		add: #'__name__';
		add: #'__qualname__';
		add: #'__doc__';
		add: #'__module__';
		add: #'__wrapped__';
		add: #'__annotations__';
		yourself

]
