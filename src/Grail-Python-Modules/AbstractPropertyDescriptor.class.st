Class {
	#name : 'AbstractPropertyDescriptor',
	#superclass : 'Object',
	#instVars : [
		'fget',
		'fset',
		'fdel',
		'name',
		'getterDoc'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Python Attribute Hook' }
AbstractPropertyDescriptor class >> ___pythonValueAttrs___ [
	^ IdentitySet new
		add: #'fget';
		add: #'fset';
		add: #'fdel';
		add: #'__doc__';
		add: #'__name__';
		add: #'__isabstractmethod__';
		yourself

]

{ #category : 'Grail-Private' }
AbstractPropertyDescriptor >> _getterDoc [
	^ getterDoc == true

]

{ #category : 'Grail-Private' }
AbstractPropertyDescriptor >> _rawFdel [
	^ fdel

]

{ #category : 'Grail-Private' }
AbstractPropertyDescriptor >> _rawFget [
	^ fget

]

{ #category : 'Grail-Private' }
AbstractPropertyDescriptor >> _rawFset [
	^ fset

]
