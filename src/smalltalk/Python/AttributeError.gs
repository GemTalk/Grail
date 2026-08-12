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
	msg := (anObject @env0:class @env0:name @env0:asString) @env0:,
		' object has no attribute ''' @env0:, aName @env0:asString @env0:, ''''.
	instance := self @env1:___new___.
	instance @env1:___args___: { msg }.
	instance @env0:dynamicInstVarAt: #'name' put: aName @env0:asString.
	instance @env0:dynamicInstVarAt: #'obj' put: anObject.
	^ instance @env1:___signal___: msg
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
