Extension { #name : 'UndefinedObject' }

{ #category : 'Grail-Python protocol' }
UndefinedObject class >> __getitem__: index [
	^ TypeError ___signal___: 'type ''NoneType'' is not subscriptable'

]
