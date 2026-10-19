"Python ``classmethod(f)' -- a descriptor whose __get__ binds the CLASS as the
wrapped function's first argument, whether it is read through the class or
through an instance.  Not callable directly, matching CPython."
Class {
	#name : 'PyClassMethod',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
PyClassMethod class >> ___pythonValueAttrs___ [
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
