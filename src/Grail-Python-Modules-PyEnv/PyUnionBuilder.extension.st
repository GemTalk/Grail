Extension { #name : 'PyUnionBuilder' }

{ #category : 'Grail-Hashing' }
PyUnionBuilder class >> ___hashOf: anObject [
	"anObject's Python hash, or nil when it has none: CPython's builder
	clears the error and keeps the member as unhashable."

	^ [(builtins @env1:instance) @env1:hash: anObject]
		@env0:on: AbstractException
		do: [:ex |
			(ex @env0:isKindOf: Notification) ifTrue: [ex @env0:pass].
			ex @env0:return: nil]

]

{ #category : 'Grail-Building' }
PyUnionBuilder >> add: aMember [
	"Keep aMember unless it repeats one already kept (unionbuilder_add_single_unchecked)."

	| hash |
	hash := PyUnionBuilder ___hashOf: aMember.
	hash @env0:isNil
		ifTrue: [
			(unhashable @env0:anySatisfy: [:each | each ___pyRichEqBool___: aMember]) ifTrue: [^ self].
			unhashable @env0:add: aMember]
		ifFalse: [
			(hashed @env0:anySatisfy: [:pair |
				(pair @env0:first @env0:= hash) and: [pair @env0:last ___pyRichEqBool___: aMember]])
					ifTrue: [^ self].
			hashed @env0:add: (Array @env0:with: hash with: aMember)].
	members @env0:add: aMember

]

{ #category : 'Grail-Building' }
PyUnionBuilder >> addMembersOf: anOperand [
	"Add anOperand's members: its own when it is a union, otherwise itself."

	(PyUnionType ___membersOf___: anOperand) @env0:do: [:each | self add: each]

]

{ #category : 'Grail-Building' }
PyUnionBuilder >> isEmpty [
	^ members @env0:isEmpty

]

{ #category : 'Grail-Building' }
PyUnionBuilder >> union [
	"The union of the members kept, or the member itself when there is one:
	``int | int'' is int."

	members @env0:size @env0:= 1 ifTrue: [^ members @env0:first].
	^ PyUnionType ___withMembers: members @env0:asArray unhashable: unhashable @env0:asArray

]
