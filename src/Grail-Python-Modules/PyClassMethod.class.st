"Python ``classmethod(f)' -- a descriptor whose __get__ binds the CLASS as the
wrapped function's first argument, whether it is read through the class or
through an instance.  Not callable directly, matching CPython."
Class {
	#name : 'PyClassMethod',
	#superclass : 'PythonInstance',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Attribute Access' }
PyClassMethod class >> ___grailReadonlyAttributes___ [
	"Classmethod's members and its __isabstractmethod__ getter -- see Object class >> ___grailReadonlyAttributes___."

	^ #('__func__' '__wrapped__')

]

{ #category : 'Grail-Attribute Access' }
PyClassMethod class >> ___grailUnwritableAttributes___ [
	"classmethod's members and its __isabstractmethod__ getter -- see Object class >> ___grailUnwritableAttributes___."

	^ #('__isabstractmethod__')

]

{ #category : 'Grail-Attribute Access' }
PyClassMethod class >> ___grailUnwritableOwnerName___ [

	^ 'classmethod'

]

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
