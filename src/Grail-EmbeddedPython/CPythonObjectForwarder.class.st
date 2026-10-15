"Grail-side forwarder for an arbitrary PyObject* outside the
scalar/container replication set (e.g. re.Pattern, set, bytes).
Produced by PythonReplicator>>forwarderFor: and cached identity-keyed
by PyObject* address."
Class {
	#name : 'CPythonObjectForwarder',
	#superclass : 'Object',
	#instVars : [
		'cpythonObject'
	],
	#gs_options : [
		'instancesNonPersistent'
	],
	#category : 'Grail-CPython'
}

{ #category : 'Grail-Attribute Access' }
CPythonObjectForwarder class >> attributeNameIn: aSelector [
	"Python attribute name encoded in a CallAst/AttributeAst selector,
	stripping the _ varargs prefix and any keyword segments."

	| firstSegmentStart firstColon |
	firstSegmentStart := (self selectorIsKeywordVarargs: aSelector)
		ifTrue: [2] ifFalse: [1].
	firstColon := aSelector indexOf: $:.
	firstColon = 0 ifTrue: [^ aSelector asSymbol].
	^ (aSelector copyFrom: firstSegmentStart to: firstColon - 1) asSymbol

]

{ #category : 'Grail-Attribute Access' }
CPythonObjectForwarder class >> dispatchAttributeOrCall: aSelector arguments: anArray
loadingAttributeWith: aLoadAttributeBlock
ifUnsupported: aFallbackBlock [
	"Shared by CPythonObjectForwarder and EmbeddedExtensionModule."

	| attributeName positionalArguments keywordArguments loadedAttribute |
	attributeName := self attributeNameIn: aSelector.
	(self selectorIsKeywordVarargs: aSelector)
		ifTrue: [
			positionalArguments := anArray first.
			keywordArguments := anArray second]
		ifFalse: [
			positionalArguments := anArray.
			keywordArguments := nil].
	loadedAttribute := aLoadAttributeBlock value: attributeName.
	loadedAttribute ifNil: [^ aFallbackBlock value].
	((loadedAttribute isKindOf: CPythonObjectForwarder) and: [loadedAttribute isCallable])
		ifTrue: [^ loadedAttribute
			@env1:value: positionalArguments asArray
			value: keywordArguments].
	positionalArguments isEmptyOrNil ifTrue: [^ loadedAttribute].
	^ aFallbackBlock value

]

{ #category : 'Grail-Instance Creation' }
CPythonObjectForwarder class >> forCpythonObject: aCPythonObject [

	^ self basicNew setCpythonObject: aCPythonObject

]

{ #category : 'Grail-Attribute Access' }
CPythonObjectForwarder class >> replicateAttribute: attributeName of: aCPythonObject [
	"getattr(aCPythonObject, attributeName) replicated to GemStone,
	releasing the borrowed handle."

	| pythonAttribute |
	pythonAttribute := aCPythonObject getAttribute: attributeName asString.
	[^ pythonAttribute asSmalltalk] ensure: [pythonAttribute release]

]

{ #category : 'Grail-Attribute Access' }
CPythonObjectForwarder class >> selectorIsKeywordVarargs: aSelector [
	"Varargs call sites compile to selectors of the form _name:kw:
	(one leading underscore, trailing :kw: chunk); the two arguments
	are a positional collection and a keyword dictionary."

	^ (aSelector beginsWith: '_') and: [aSelector endsWith: ':kw:']

]

{ #category : 'Grail-Calling' }
CPythonObjectForwarder >> callWithArguments: positionalArguments keywords: keywordArguments [

	| replicator pythonArguments pythonResult |
	self isCallable ifFalse: [
		TypeError signal:
			'CPythonObjectForwarder: underlying Python object is not callable'].
	keywordArguments isEmptyOrNil ifFalse: [
		Error signal:
			'Keyword arguments are not yet supported for embedded C extension calls'].
	replicator := PythonReplicator new.
	pythonArguments := OrderedCollection new.
	[
		positionalArguments do: [:each |
			pythonArguments add: (replicator gemStoneToPython: each)].
		pythonResult := cpythonObject callWithArguments: pythonArguments asArray
	] ensure: [
		pythonArguments do: [:each | each release]].
	[^ replicator pythonToGemStone: pythonResult]
		ensure: [pythonResult release]

]

{ #category : 'Grail-Attribute Access' }
CPythonObjectForwarder >> cantPerform: aSelector withArguments: anArray env: envId [
	"Mirror DNU handling for explicit perform: env: calls.  GemStone's
	perform:env:withArguments: dispatch path lands here, not in
	doesNotUnderstand:args:envId:, so without this mirror a dynamic send
	(e.g. BoundMethod's fixed-arity path) would miss the CPython forwarder
	dispatch and raise MNU."

	^ self doesNotUnderstand: aSelector args: anArray envId: envId

]

{ #category : 'Grail-Accessing' }
CPythonObjectForwarder >> cpythonObject [

	^ cpythonObject

]

{ #category : 'Grail-Attribute Access' }
CPythonObjectForwarder >> doesNotUnderstand: aSelector args: anArray envId: envId [
	"Python AttributeError surfaces as MessageNotUnderstood so existing
	on: MessageNotUnderstood callers (e.g. bool __new__:'s __bool__
	probe) keep working."

	^ CPythonObjectForwarder
		dispatchAttributeOrCall: aSelector arguments: anArray
		loadingAttributeWith: [:attributeName | self loadAttributeIfPresent: attributeName]
		ifUnsupported: [super doesNotUnderstand: aSelector args: anArray envId: envId]

]

{ #category : 'Grail-Testing' }
CPythonObjectForwarder >> isCallable [

	^ cpythonObject isCallable

]

{ #category : 'Grail-Attribute Access' }
CPythonObjectForwarder >> loadAttributeIfPresent: attributeName [

	^ [self @env1:___pyAttrLoad___: attributeName]
		on: CPythonException
		do: [:exception |
			exception pythonTypeName = 'AttributeError'
				ifTrue: [nil]
				ifFalse: [exception pass]]

]

{ #category : 'Grail-Printing' }
CPythonObjectForwarder >> printOn: aStream [

	aStream
		nextPutAll: 'CPythonObjectForwarder(';
		nextPutAll: self pythonRepresentation;
		nextPutAll: ')'

]

{ #category : 'Grail-Hashing' }
CPythonObjectForwarder >> pythonHash [
	"hash(cpythonObject) as a SmallInteger (raises TypeError for unhashable
	objects, matching CPython)."

	| pythonHash |
	pythonHash := cpythonObject send: '__hash__' withArguments: #().
	[^ pythonHash asInteger] ensure: [pythonHash release]

]

{ #category : 'Grail-Printing' }
CPythonObjectForwarder >> pythonRepresentation [

	| pythonRepr |
	pythonRepr := cpythonObject repr.
	[^ pythonRepr asString] ensure: [pythonRepr release]

]

{ #category : 'Grail-Printing' }
CPythonObjectForwarder >> pythonString [
	"Smalltalk string form of str(cpythonObject)."

	| pythonStr |
	pythonStr := cpythonObject str.
	[^ pythonStr asString] ensure: [pythonStr release]

]

{ #category : 'Grail-Accessing' }
CPythonObjectForwarder >> pythonType [
	"The underlying Python type, replicated (itself a forwarder)."

	| pyType |
	pyType := cpythonObject type.
	[^ PythonReplicator new pythonToGemStone: pyType] ensure: [pyType release]

]

{ #category : 'Grail-Initialization' }
CPythonObjectForwarder >> setCpythonObject: aCPythonObject [

	cpythonObject := aCPythonObject

]
