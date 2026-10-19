Extension { #name : 'functools_Placeholder' }

{ #category : 'Grail-Singleton' }
functools_Placeholder class >> ___singleton___ [
	"The sole Placeholder instance.  SESSION-LOCAL (SessionTemps):
	Placeholders are transient partial-construction sentinels compared
	by identity WITHIN a session and never committed (a value that
	needs to persist would not be a Placeholder).  Keeps the sentinel
	off any committed class -- see the session-state policy."

	| p |
	p := SessionTemps @env0:current @env0:at: #GrailFunctoolsPlaceholder otherwise: nil.
	p @env0:isNil ifTrue: [
		p := self @env0:new.
		"``functools.Placeholder.__module__'' is 'functools' in CPython: the
		INSTANCE answers it, because _PlaceholderType is a heap type carrying
		__module__ in its dict.  Stored on the singleton rather than as an
		instance-side method, because a method here would be read back as a
		BoundMethod (only __class__ / __doc__ are value-dunders on instances).
		Not a general rule: ``(1).__module__'' and the sys structseq
		singletons raise AttributeError in CPython too, so Placeholder is the
		only flattened module-attribute instance that carries one.  Name taken
		from the shared registry so it is stated once."
		p @env0:dynamicInstVarAt: #'__module__'
			put: (self ___pythonModuleAttrIdentity___ @env0:at: 2).
		SessionTemps @env0:current @env0:at: #GrailFunctoolsPlaceholder put: p].
	^ p

]

{ #category : 'Grail-Singleton' }
functools_Placeholder class >> value: positional value: keywords [
	"type(Placeholder)() returns the singleton; any argument raises
	TypeError (CPython: the Placeholder type takes no arguments)."

	((positional ~~ nil and: [positional @env0:isEmpty @env0:not])
		or: [keywords ~~ nil and: [keywords @env0:isEmpty @env0:not]]) ifTrue: [
		TypeError ___signal___: 'Placeholder() takes no arguments'].
	^ self ___singleton___

]

{ #category : 'Grail-String Representation' }
functools_Placeholder >> __repr__ [
	^ 'Placeholder'

]
