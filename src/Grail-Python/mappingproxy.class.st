Class {
	#name : 'mappingproxy',
	#superclass : 'object',
	#instVars : [
		'mapping'
	],
	#category : 'Grail-Collections'
}

{ #category : 'Grail-Python Attribute Hook' }
mappingproxy class >> ___pythonValueAttrs___ [
	"``mapping'' is read as a value, so the read runs mappingproxy >> mapping,
	which refuses it as CPython does; read as a method it answered a bound
	method, and hasattr() said yes."

	^ IdentitySet new
		add: #mapping;
		yourself

]

{ #category : 'Grail-Compat' }
mappingproxy >> at: aKey [
	^ mapping at: aKey

]

{ #category : 'Grail-Compat' }
mappingproxy >> includesKey: aKey [
	^ mapping includesKey: aKey

]

{ #category : 'Grail-Compat' }
mappingproxy >> keysAndValuesDo: aBlock [
	mapping keysAndValuesDo: aBlock

]

{ #category : 'Grail-Compat' }
mappingproxy >> size [
	^ mapping size

]
