! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- AttributeError
expectvalue /Class
doit
Exception subclass: 'AttributeError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
AttributeError category: 'Grail-Exceptions'
%

! ------------------- Helpers used by codegen for unset-instVar checks
set compile_env: 0

category: 'Grail-Unset-Attr Check'
classmethod: AttributeError
___checkAttr: aValue ofObject: anObject named: aSymbol
	"Codegen helper: return ``aValue`` unchanged if it is not Smalltalk nil,
	otherwise raise AttributeError naming the receiver's class and the
	attribute. Emitted by AttributeAst's load-context codegen for
	``self.X`` reads in Phase 5c class methods. The ``nil = unset``
	invariant follows from the same singleton-None / Phase D work that
	makes the local variable check correct."

	aValue == nil ifTrue: [
		^ self @env1:___signal___:
			('''' , (anObject class name asString) ,
			 ''' object has no attribute ''' , aSymbol asString , '''')
	].
	^ aValue
%

category: 'Grail-Attribute Errors'
classmethod: AttributeError
___signalMissing___: aName on: anObject
	"Raise AttributeError for a missing attribute, carrying CPython's ``name''
	and ``obj'' attributes.

	Those two are not decoration: traceback.py's suggestion machinery needs
	both -- ``name'' is the misspelling to match and ``obj'' is what supplies the
	candidates (dir(obj)) -- so without them ``Did you mean: 'blech'?'' can never
	be computed.  CPython has carried them since 3.10 and the stdlib reads them
	(``except AttributeError as e: if e.name == ...'').

	Stored as DYNAMIC INSTVARS under their own Python names, which is the idiom
	__notes__ already uses: ___pyAttrLoad___ probes dynamic instVars before the
	method chain, so ``e.name'' resolves to the value with no accessor to write
	and no risk of handing back a BoundMethod instead.

	The message keeps Grail's existing wording rather than CPython's quoted
	``'A' object has no attribute 'x''' -- retyping it is a separate change with
	its own blast radius across tests that assert on it."

	| instance msg |
	"CPython quotes the type name: ``'A' object has no attribute 'x'''.  The
	sibling path above (aValue == nil) already emitted the quoted form, so Grail
	was inconsistent with ITSELF as well as with CPython, and
	test_getattr_suggestions asserts on the full rendered message."
	"A CLASS receiver reads differently in CPython: ``type object 'C1' has no
	attribute 'foo'''.  Grail said ``C1 class object has no attribute 'foo''',
	because the metaclass's own name IS ``C1 class'' -- plausible-looking and
	wrong in both halves."
	msg := (anObject @env0:isKindOf: Behavior)
		ifTrue: ['type object ''' @env0:,
			(anObject @env0:___pyClassNameForError___) @env0:asString @env0:,
			''' has no attribute ''' @env0:, aName @env0:asString @env0:, '''']
		ifFalse: ['''' @env0:, (anObject @env0:___pyDnuTypeName___) @env0:asString @env0:,
			''' object has no attribute ''' @env0:, aName @env0:asString @env0:, ''''].
	^ self ___signalAttr___: aName on: anObject message: msg
%

category: 'Grail-Attribute Errors'
classmethod: AttributeError
___signalAttr___: aName on: anObject message: aMessage
	"Raise an AttributeError carrying CPython's ``name'' and ``obj'', under a
	message the caller has already composed.  Extracted so the two refusals
	that differ ONLY in wording -- a missing attribute and a store onto an
	object that has no instance dictionary -- cannot drift apart in the part
	that matters to the stdlib, which is the two stamped attributes rather
	than the prose."

	| instance |
	instance := self @env1:___new___.
	instance @env1:___args___: { aMessage }.
	instance @env0:dynamicInstVarAt: #'name' put: aName @env0:asString.
	instance @env0:dynamicInstVarAt: #'obj' put: anObject.
	^ instance @env1:___signal___: aMessage
%

category: 'Grail-Attribute Errors'
classmethod: AttributeError
___signalNoDict___: aName on: anObject
	"CPython's refusal for a STORE onto an object with no instance dictionary:

	    'int' object has no attribute 'zz' and no __dict__ for setting new attributes

	The suffix is why this is a second entry point rather than a reuse of
	___signalMissing___:on:.  From an ASSIGNMENT, ``has no attribute 'zz'''
	alone reads as a typo and sends the reader looking for the right spelling;
	the real answer is that the type holds no attributes at all, so no spelling
	would have worked.  CPython distinguishes the two and so should Grail."

	^ self ___signalAttr___: aName on: anObject
		message: ('''' @env0:, (anObject @env0:___pyDnuTypeName___) @env0:asString
			@env0:, ''' object has no attribute ''' @env0:, aName @env0:asString
			@env0:, ''' and no __dict__ for setting new attributes')
%

category: 'Grail-Attribute Errors'
classmethod: AttributeError
___stampContextOn___: anException name: aName obj: anObject
	"CPython's set_attribute_error_context(): an AttributeError escaping a user
	``__getattr__'' gets ``name'' and ``obj'' filled in by the interpreter when
	the exception did not supply them itself.

	That is not a detail -- test_getattr_suggestions_no_args raises a bare
	``AttributeError()'' with no arguments at all and still expects
	``Did you mean: 'blech'?'', which is only computable from the name and the
	object the access was made on.

	Fills ONLY what is missing.  An AttributeError raised by a nested access
	already names ITS attribute and object, and those must win: in
	test_attribute_error_inside_nested_getattr the suggestion comes from the
	inner object, not from the one whose __getattr__ was entered."

	(anException @env0:dynamicInstVarAt: #'name') isNil ifTrue: [
		anException @env0:dynamicInstVarAt: #'name' put: aName @env0:asString].
	(anException @env0:dynamicInstVarAt: #'obj') isNil ifTrue: [
		anException @env0:dynamicInstVarAt: #'obj' put: anObject].
	^ anException
%
