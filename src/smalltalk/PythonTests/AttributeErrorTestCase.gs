! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for AttributeErrorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'AttributeErrorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
AttributeErrorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! AttributeErrorTestCase - Tests for Python AttributeError
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
AttributeErrorTestCase removeAllMethods.
AttributeErrorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests-AttributeError'
method: AttributeErrorTestCase
test_creation
	"Test creating a AttributeError instance."
	
	| exc |
	exc := AttributeError ___new___:  AttributeError .
	self assert: exc notNil.
%

category: 'Grail-Tests-AttributeError'
method: AttributeErrorTestCase
test_inheritance
	"Test that AttributeError inherits from Exception."

	| exc |
	exc := AttributeError ___new___:  AttributeError .
	self assert: (exc isKindOf: Exception).
%

! ===============================================================================
! Phase C-3 — ___checkAttr:ofObject:named: helper
! ===============================================================================
! Emitted by AttributeAst codegen for ``self.X`` reads in Phase 5c class
! methods. Returns the value when set, raises AttributeError naming the
! class and attribute when the underlying instVar is nil (= unset).

category: 'Grail-Tests-Unset-Attr'
method: AttributeErrorTestCase
test_check_attr_returns_value_when_set
	"The check is transparent for non-nil values."

	self
		assert: (AttributeError ___checkAttr: 42 ofObject: self named: #x)
		equals: 42.
	self
		assert: (AttributeError ___checkAttr: 'hi' ofObject: self named: #s)
		equals: 'hi'.
%

category: 'Grail-Tests-Unset-Attr'
method: AttributeErrorTestCase
test_check_attr_returns_none_when_none
	"None — the singleton — is a legitimate value, not unset. Distinct
	from nil per the singleton design."

	self
		assert: (AttributeError ___checkAttr: None ofObject: self named: #x) == None.
%

category: 'Grail-Tests-Unset-Attr'
method: AttributeErrorTestCase
test_check_attr_raises_when_nil
	"nil triggers AttributeError."

	self
		should: [AttributeError ___checkAttr: nil ofObject: self named: #missing]
		raise: AttributeError.
%

category: 'Grail-Tests-Unset-Attr'
method: AttributeErrorTestCase
test_check_attr_message_names_attribute
	"The error message follows CPython's format and includes the
	attribute name."

	[AttributeError ___checkAttr: nil ofObject: self named: #missing]
		on: AttributeError do: [:ex |
			self assert:
				(ex messageText indexOfSubCollection: '''missing''') > 0.
			^ self].
	self assert: false description: 'Expected AttributeError'
%
