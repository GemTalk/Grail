fileformat utf8
set compile_env: 0
! ------------------- Class definition for CPythonObjectForwarder
expectvalue /Class
doit
Object subclass: 'CPythonObjectForwarder'
  instVarNames: #( cpythonObject )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: EmbeddedPython
  options: #( instancesNonPersistent )

%
expectvalue /Class
doit
CPythonObjectForwarder comment:
'Grail-side forwarder for an arbitrary PyObject* outside the
scalar/container replication set (e.g. re.Pattern, set, bytes).
Produced by PythonReplicator>>forwarderFor: and cached identity-keyed
by PyObject* address.'
%
expectvalue /Class
doit
CPythonObjectForwarder category: 'Grail-CPython'
%
! ------------------- Remove existing behavior from CPythonObjectForwarder
removeallmethods CPythonObjectForwarder
removeallclassmethods CPythonObjectForwarder
! ------------------- Class methods for CPythonObjectForwarder
category: 'Grail-Instance Creation'
classmethod: CPythonObjectForwarder
forCpythonObject: aCPythonObject

	^ self basicNew setCpythonObject: aCPythonObject
%
category: 'Grail-Attribute Access'
classmethod: CPythonObjectForwarder
dispatchAttributeOrCall: aSelector arguments: anArray
loadingAttributeWith: aLoadAttributeBlock
ifUnsupported: aFallbackBlock
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
%
category: 'Grail-Attribute Access'
classmethod: CPythonObjectForwarder
selectorIsKeywordVarargs: aSelector
	"Varargs call sites compile to selectors of the form _name:kw:
	(one leading underscore, trailing :kw: chunk); the two arguments
	are a positional collection and a keyword dictionary."

	^ (aSelector beginsWith: '_') and: [aSelector endsWith: ':kw:']
%
category: 'Grail-Attribute Access'
classmethod: CPythonObjectForwarder
attributeNameIn: aSelector
	"Python attribute name encoded in a CallAst/AttributeAst selector,
	stripping the _ varargs prefix and any keyword segments."

	| firstSegmentStart firstColon |
	firstSegmentStart := (self selectorIsKeywordVarargs: aSelector)
		ifTrue: [2] ifFalse: [1].
	firstColon := aSelector indexOf: $:.
	firstColon = 0 ifTrue: [^ aSelector asSymbol].
	^ (aSelector copyFrom: firstSegmentStart to: firstColon - 1) asSymbol
%
category: 'Grail-Attribute Access'
classmethod: CPythonObjectForwarder
replicateAttribute: attributeName of: aCPythonObject
	"getattr(aCPythonObject, attributeName) replicated to GemStone,
	releasing the borrowed handle."

	| pythonAttribute |
	pythonAttribute := aCPythonObject getAttribute: attributeName asString.
	[^ pythonAttribute asSmalltalk] ensure: [pythonAttribute release]
%
! ------------------- Instance methods for CPythonObjectForwarder
category: 'Grail-Accessing'
method: CPythonObjectForwarder
cpythonObject

	^ cpythonObject
%
category: 'Grail-Initialization'
method: CPythonObjectForwarder
setCpythonObject: aCPythonObject

	cpythonObject := aCPythonObject
%
category: 'Grail-Testing'
method: CPythonObjectForwarder
isCallable

	^ cpythonObject isCallable
%
category: 'Grail-Printing'
method: CPythonObjectForwarder
pythonRepresentation

	| pythonRepr |
	pythonRepr := cpythonObject repr.
	[^ pythonRepr asString] ensure: [pythonRepr release]
%
category: 'Grail-Printing'
method: CPythonObjectForwarder
printOn: aStream

	aStream
		nextPutAll: 'CPythonObjectForwarder(';
		nextPutAll: self pythonRepresentation;
		nextPutAll: ')'
%
category: 'Grail-Printing'
method: CPythonObjectForwarder
pythonString
	"Smalltalk string form of str(cpythonObject)."

	| pythonStr |
	pythonStr := cpythonObject str.
	[^ pythonStr asString] ensure: [pythonStr release]
%
category: 'Grail-Accessing'
method: CPythonObjectForwarder
pythonType
	"The underlying Python type, replicated (itself a forwarder)."

	| pyType |
	pyType := cpythonObject type.
	[^ PythonReplicator new pythonToGemStone: pyType] ensure: [pyType release]
%
category: 'Grail-Hashing'
method: CPythonObjectForwarder
pythonHash
	"hash(cpythonObject) as a SmallInteger (raises TypeError for unhashable
	objects, matching CPython)."

	| pythonHash |
	pythonHash := cpythonObject send: '__hash__' withArguments: #().
	[^ pythonHash asInteger] ensure: [pythonHash release]
%
category: 'Grail-Attribute Access'
method: CPythonObjectForwarder
loadAttributeIfPresent: attributeName

	^ [self @env1:___pyAttrLoad___: attributeName]
		on: CPythonException
		do: [:exception |
			exception pythonTypeName = 'AttributeError'
				ifTrue: [nil]
				ifFalse: [exception pass]]
%
category: 'Grail-Attribute Access'
method: CPythonObjectForwarder
doesNotUnderstand: aSelector args: anArray envId: envId
	"Python AttributeError surfaces as MessageNotUnderstood so existing
	on: MessageNotUnderstood callers (e.g. bool __new__:'s __bool__
	probe) keep working."

	^ CPythonObjectForwarder
		dispatchAttributeOrCall: aSelector arguments: anArray
		loadingAttributeWith: [:attributeName | self loadAttributeIfPresent: attributeName]
		ifUnsupported: [super doesNotUnderstand: aSelector args: anArray envId: envId]
%
category: 'Grail-Attribute Access'
method: CPythonObjectForwarder
cantPerform: aSelector withArguments: anArray env: envId
	"Mirror DNU handling for explicit perform: env: calls.  GemStone's
	perform:env:withArguments: dispatch path lands here, not in
	doesNotUnderstand:args:envId:, so without this mirror a dynamic send
	(e.g. BoundMethod's fixed-arity path) would miss the CPython forwarder
	dispatch and raise MNU."

	^ self doesNotUnderstand: aSelector args: anArray envId: envId
%
category: 'Grail-Calling'
method: CPythonObjectForwarder
callWithArguments: positionalArguments keywords: keywordArguments

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
%

set compile_env: 1

category: 'Grail-Attribute Access'
method: CPythonObjectForwarder
___pyAttrLoad___: attributeName

	^ CPythonObjectForwarder @env0:replicateAttribute: attributeName of: cpythonObject
%

category: 'Grail-Calling'
method: CPythonObjectForwarder
value: positionalArguments value: keywordArguments

	^ self
		@env0:callWithArguments: positionalArguments
		keywords: keywordArguments
%

category: 'Grail-Calling'
method: CPythonObjectForwarder
___pyCallValue___: positional kw: kwargs
	"Generic Python call protocol: fires when the callee's callability
	isn't known at codegen time ('f = obj.method; f(x)').  The fused
	'recv.attr(args)' form is handled by the DNU dispatcher's call
	branch; this covers the two-step case, which would otherwise hit
	Object's default and raise 'object is not callable'."

	^ self @env0:callWithArguments: positional keywords: kwargs
%

category: 'Grail-Python Protocol'
method: CPythonObjectForwarder
__repr__
	"repr(obj): forward to the underlying PyObject rather than letting
	Object's env-1 default describe the forwarder itself."

	^ self @env0:pythonRepresentation
%

category: 'Grail-Python Protocol'
method: CPythonObjectForwarder
__str__

	^ self @env0:pythonString
%

category: 'Grail-Python Protocol'
method: CPythonObjectForwarder
__class__
	"type(obj): the underlying Python type (itself a forwarder), not
	the CPythonObjectForwarder Smalltalk class."

	^ self @env0:pythonType
%

category: 'Grail-Python Protocol'
method: CPythonObjectForwarder
__hash__

	^ self @env0:pythonHash
%

set compile_env: 0
