! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for SelectorManglingApiTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'SelectorManglingApiTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
SelectorManglingApiTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SelectorManglingApiTestCase - the public Python-name <-> env-1-selector
! mangling API (issue #884):
!     importlib class >> pythonSelectorsForName:arity:   (encode)
!     importlib class >> pythonNameOfSelector:           (decode)
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SelectorManglingApiTestCase removeAllMethods.
SelectorManglingApiTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_encode_fixed_arity
	"f(a) -> #f:, f(a,b) -> #f:_:, f(a,b,c) -> #f:_:_:"

	self assert: ((importlib pythonSelectorsForName: 'copyfile' arity: 1)
		includes: #'copyfile:').
	self assert: ((importlib pythonSelectorsForName: 'copyfile' arity: 2)
		includes: #'copyfile:_:').
	self assert: ((importlib pythonSelectorsForName: 'copyfile' arity: 3)
		includes: #'copyfile:_:_:').
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_encode_includes_varargs_at_every_arity
	"Which shape a call compiled to depends on the CALLEE, so the varargs
	candidate is offered whatever the arity."

	1 to: 4 do: [:n |
		self assert: ((importlib pythonSelectorsForName: 'copyfile' arity: n)
			includes: #'_copyfile:kw:')].
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_encode_arity_zero_has_no_fixed_shape
	"The unary #name selector is reserved for the legacy block getter
	(CallAst>>bareCallFastPathSelector), so a 0-arg call has only the
	varargs candidate."

	self assert: (importlib pythonSelectorsForName: 'foo' arity: 0)
		equals: (Array with: #'_foo:kw:').
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_encode_nil_arity_enumerates_to_the_published_horizon
	"A caller can report what it searched instead of guessing."

	| cands max |
	max := importlib pythonSelectorMaxSearchedArity.
	cands := importlib pythonSelectorsForName: 'foo' arity: nil.
	self assert: cands size equals: max + 1.
	self assert: (cands includes: #'_foo:kw:').
	self assert: (cands includes: #'foo:').
	self assert: (cands includes:
		(CallAst fastPathSelectorForName: 'foo' arity: max)).
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_encode_delegates_to_codegen
	"The public API must not become a second copy of the rule: every
	candidate it answers is one CallAst itself would build."

	1 to: 5 do: [:n |
		self assert: ((importlib pythonSelectorsForName: 'thing' arity: n)
			includes: (CallAst fastPathSelectorForName: 'thing' arity: n))].
	self assert: ((importlib pythonSelectorsForName: 'thing' arity: nil)
		includes: (CallAst varargsSelectorForName: 'thing')).
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_decode_varargs
	"The direction nothing in the tree implemented."

	self assert: (importlib pythonNameOfSelector: #'_copyfile:kw:')
		equals: 'copyfile'.
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_decode_fixed_arity
	self assert: (importlib pythonNameOfSelector: #'copyfile:') equals: 'copyfile'.
	self assert: (importlib pythonNameOfSelector: #'copyfile:_:') equals: 'copyfile'.
	self assert: (importlib pythonNameOfSelector: #'copyfile:_:_:_:') equals: 'copyfile'.
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_decode_keeps_a_leading_underscore_in_the_python_name
	"TRAP 1: a Python name that already starts with an underscore gains
	another one, so stripping every leading underscore manufactures
	attributes that do not exist."

	self assert: (importlib pythonNameOfSelector: #'__foo:kw:') equals: '_foo'.
	self assert: (importlib pythonNameOfSelector: #'_foo:') equals: '_foo'.
	self assert: (importlib pythonNameOfSelector: #'_foo:_:') equals: '_foo'.
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_decode_does_not_confuse_varargs_with_a_two_argument_call
	"TRAP 2: the varargs form is exactly #_name:kw:.  A fixed 2-argument
	selector reads #name:_:, and a bare #name:kw: is neither shape."

	self assert: (importlib pythonNameOfSelector: #'_head:kw:') equals: 'head'.
	self assert: (importlib pythonNameOfSelector: #'head:_:') equals: 'head'.
	self assert: (importlib pythonNameOfSelector: #'head:kw:') equals: nil.
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_decode_rejects_ordinary_smalltalk_selectors
	self assert: (importlib pythonNameOfSelector: #'at:put:') equals: nil.
	self assert: (importlib pythonNameOfSelector: #'copyFrom:to:') equals: nil.
	self assert: (importlib pythonNameOfSelector: #'+') equals: nil.
	self assert: (importlib pythonNameOfSelector: #'<=') equals: nil.
	self assert: (importlib pythonNameOfSelector: nil) equals: nil.
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_decode_rejects_grail_internals
	"#___pyCallValue___:kw: is structurally a varargs selector, but
	``__pyCallValue___'' is not a Python name anybody called."

	self assert: (importlib pythonNameOfSelector: #'___pyCallValue___:kw:') equals: nil.
	self assert: (importlib pythonNameOfSelector: #'___pyAttrLoad___:') equals: nil.
	self assert: (importlib pythonNameOfSelector: #'___liveFrameChain___') equals: nil.
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_decode_allows_a_python_name_beginning_with_three_underscores
	"The internals test needs BOTH ends, so a Python name spelled ``__x''
	-- whose varargs selector opens with three underscores -- still decodes."

	self assert: (importlib pythonNameOfSelector: #'___x:kw:') equals: '__x'.
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_decode_unary_is_the_identity
	"That IS the encoding for an attribute load / legacy block fetch."

	self assert: (importlib pythonNameOfSelector: #'copyfile') equals: 'copyfile'.
%

category: 'Grail-Tests-SelectorMangling'
method: SelectorManglingApiTestCase
test_round_trip
	"Every selector the encoder produces decodes back to the name it came from."

	#('copyfile' 'x' '_foo' '__x' 'a_b_9') do: [:name |
		(importlib pythonSelectorsForName: name arity: nil) do: [:sel |
			self assert: (importlib pythonNameOfSelector: sel) equals: name]].
%
