! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExecWithClosureIRTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExecWithClosureIRTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ExecWithClosureIRTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExecWithClosureIRTestCase
!
! ``exec(f.__code__, g, closure=cells)'' WITH THE DEF COMPILED ON THE IR PATH.
!
! The substitution re-runs the def's BODY TEXT against a namespace backed by the
! cells -- Grail's free variables are Smalltalk temps captured at def time, so a
! compiled closure cannot be re-entered with different ones.  The text is
! carried on the code object by ``___setBodySource___:'', one of the setters the
! text path chains onto a def's PyCode (emitCodeExtrasOn:nested:).
!
! The IR path built the same PyCode in two places, and each had HAND-COPIED the
! first two setters -- flags and free variables -- when it was written.  The text
! then gained co_consts and the body text, and neither copy followed.  So under
! IR every such exec refused with ``cannot run this code object with a closure'',
! for every def, and ExecWithClosureTestCase could not show it on the default
! gate: it inherits the ambient flag, and the text path is right.
!
! FORCED, for that reason.  This drives the same fixture as
! ExecWithClosureTestCase and reads the same roll-up; what differs is only that
! the def under test is compiled through the IR emit.
! ===============================================================================

doit
ExecWithClosureIRTestCase removeAllMethods.
ExecWithClosureIRTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ExecWithClosureIRTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'ewc_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'ewc_ir'.
	irModule := nil
%

category: 'Grail-Private'
method: ExecWithClosureIRTestCase
___irModule___
	"Forced rather than inherited: the text path is correct, so a flag-off run
	compiles none of the emit under test."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'ewc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ewc_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/exec_with_closure.py'
		name: 'ewc_ir'.
	^ irModule
%

category: 'Grail-Private'
method: ExecWithClosureIRTestCase
___reprAt___: aKey from: aDictName
	^ (builtins @env1:instance) @env1:repr:
		((self ___irModule___ @env1:___pyAttrLoad___: aDictName asSymbol)
			@env1:__getitem__: aKey)
%

category: 'Grail-Tests - the substitution under IR'
method: ExecWithClosureIRTestCase
testTheSubstitutedCellsAreUsedUnderIR
	"The row that proves the cells are USED rather than the def being called:
	2*3 with its own cells, 35*72 with two replaced.  Before the fix both rows
	were the refusal TypeError."

	#('own_closure' 'substituted_closure') do: [:k |
		self
			assert: (self ___reprAt___: k from: 'r') asString
			equals: (self ___reprAt___: k from: 'EXPECTED') asString]
%

category: 'Grail-Tests - the substitution under IR'
method: ExecWithClosureIRTestCase
testEveryCheckAgreesWithCPythonUnderIR
	"All fifteen, through the fixture's own roll-up.  The refusal rows matter
	here too: carrying the body text must not turn a refusal CPython makes into
	an execution Grail allows."

	self
		assert: ((self ___irModule___ @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '15 checks, 0 disagreeing [], keys match: True'
%
