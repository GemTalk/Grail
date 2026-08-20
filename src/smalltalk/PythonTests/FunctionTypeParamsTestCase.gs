! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FunctionTypeParamsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FunctionTypeParamsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FunctionTypeParamsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FunctionTypeParamsTestCase
!
! ``func.__type_params__'' (PEP 695), and ``typing.TypeVar'' as a real class.
! Closes test_funcattrs' test___type_params__.
!
! THE ENABLING FIX WAS NOT IN __type_params__.  Grail already stamped the
! type-parameter NAMES at the def site and minted placeholders lazily, so
! ``generic.__type_params__'' answered ``(T,)'' with the right name.  What failed
! was the first thing a caller does with it:
!
!     T, = generic.__type_params__
!     isinstance(T, typing.TypeVar)      "TypeError: arg 2 must be a type"
!
! because typing.TypeVar was a module-level FUNCTION returning a
! _TypeVarInstance.  isinstance against a function RAISES rather than answering
! False, so this was not a wrong answer but an unusable one.
!
! TypeVar is now a class, and a SUBCLASS of _TypeVarInstance rather than a
! rename, so ParamSpec and TypeVarTuple keep answering plain _TypeVarInstance and
! stay outside it -- which is what CPython does (isinstance(ParamSpec('P'),
! TypeVar) is False there).  Folding them together would have traded one wrong
! answer for another, which is why testAParamSpecIsNotATypeVar exists.
!
! WHAT THE CLASS CHANGE BROKE, AND SILENTLY.  Grail compiles a module-level
! ``def name'' into a real Smalltalk selector, so ``mod name: x'' finds a method;
! a module-level ``class Name'' compiles to NO selector, so the identical
! spelling is a MessageNotUnderstood.  ExecBlock >> ___pyTypeVarNamed___: makes
! exactly that send -- ``typing TypeVar: aName'' -- and guards it with a fallback
! to the bare NAME STRING for the typing-not-loaded case.  So making TypeVar a
! class turned every PEP 695 type parameter into its own name: measured as
! ``placeholder ST class = Unicode7'' against a baseline of _TypeVarInstance.
! The guard could not tell the two failures apart, which is precisely the risk
! its own comment warns about.
!
! That send is in ExecBlock.gs, filed into the SHARED base on 3.7
! (scripts/install_base37.gs) and so not editable per-user.  The fix went into
! module >> doesNotUnderstand:, whose attribute-call fallback already existed but
! covered only the two-argument ``_name:kw:'' varargs shape; it now covers the
! plain ``name:'' shape too.  That is a general repair, not a workaround for this
! caller: ANY hand-written ``mod Something: arg'' against a module-level class was
! an MNU before, and the def/class asymmetry was invisible until something turned
! a module function into a class.
!
! THE WRITE AND DELETE RULES were separately absent.  An assignment of any type
! was ACCEPTED -- ``f.__type_params__ = 42'' stored the integer, so a later read
! handed a non-iterable to code that unpacks it -- and ``del'' reported
! ``AttributeError: __type_params__'' for an attribute every function has.
! CPython routes both through func_set_type_params, which has no NULL-clearing
! path, so both answer the SAME TypeError.  Its text is ``must be set to a
! tuple'' and NOT the ``must be set to a tuple object'' that __defaults__ uses one
! branch away in the same guard; the fixture compares the message, because
! copying the neighbour's wording is the natural mistake and test_funcattrs reads
! the text.
!
! Unlike __defaults__, ``del'' here is a REFUSAL rather than a clear-to-None.
!
! ONE GAP LEFT OPEN, and measured rather than assumed.  A MODULE-LEVEL generic
! def still answers AttributeError instead of its parameters: those compile to
! real Smalltalk METHODS whose metadata lives in a PyCode built by
! FunctionDefAst >> emitPyCodeExprOn:qualname: and stored in a method code table,
! and FunctionDefAst emits the ___pyTypeParams___ stamp only on the nested-def
! cascade.  Closing it means carrying the names on the PyCode -- a
! ___setTypeParamNames___: cascade beside the ___setFlags___: / ___setFreevars___:
! ones already emitted for BOTH paths -- plus a BoundMethod / UnboundMethod reader
! and their own write guards.
!
! A fixture check for it was written, RUN, and then removed rather than left red:
! an unimplemented gap is not a conformance regression, and it belongs in
! docs/Stdlib_Gaps.md (whose stale ``__type_params__ is always ()'' bullet this
! change corrects) instead of sitting as a permanently-failing check.
! test_funcattrs' test___type_params__ nests its subjects, so it does not need it.
!
! Drives tests/python/function_type_params.py, which is self-running and so
! self-verifies against CPython under scripts/check_python_fixtures.sh -- and did
! its job: a first-draft check passed constraints and ``bound'' together, which
! CPython refuses outright.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FunctionTypeParamsTestCase removeAllMethods.
FunctionTypeParamsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FunctionTypeParamsTestCase
setUp
	"Reloaded per test: assigning_a_tuple_is_allowed_and_reads_back WRITES a
	function's __type_params__, and although it restores them, a shared module
	would make that cleanup load-bearing for the other tests rather than tidy."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'function_type_params' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_type_params.py')
		name: 'function_type_params'.
%

category: 'Grail-Private'
method: FunctionTypeParamsTestCase
assertCheckPasses: aName
	"The fixture answers true, or a string naming what it saw.  The refusal
	checks in particular answer the WRONG MESSAGE rather than false, because
	getting the class right and the wording wrong is the likely failure."

	| answer |
	answer := testModule @env0:perform: aName asSymbol env: 1.
	self assert: (answer = true)
		description: 'type-params check failed: ' , aName , ' -> ' , answer printString.
%

category: 'Grail-Tests - Reading'
method: FunctionTypeParamsTestCase
testAGenericDefReportsItsTypeParams
	"Shape and arity of the tuple, and the name it carries.  Nested defs, which
	is what test___type_params__ uses -- they compile to BLOCKS."

	self assertCheckPasses: 'a_generic_def_reports_its_type_params'.
	self assertCheckPasses: 'a_type_param_carries_its_name'.
%

category: 'Grail-Tests - Reading'
method: FunctionTypeParamsTestCase
testAPlainDefAndALambdaHaveNoTypeParams
	"An empty tuple, not None and not an error -- functools.update_wrapper copies
	this name, so a raise here breaks every decorator."

	self assertCheckPasses: 'a_plain_def_has_no_type_params'.
	self assertCheckPasses: 'a_lambda_has_no_type_params'.
%

category: 'Grail-Tests - TypeVar Is A Class'
method: FunctionTypeParamsTestCase
testATypeParamIsATypeVarInstance
	"THE CHECK THIS WORK EXISTS FOR.  Before it, isinstance RAISED TypeError
	because typing.TypeVar was a function -- an unusable answer rather than a
	wrong one, since isinstance against a non-type cannot answer False."

	self assertCheckPasses: 'a_type_param_is_a_typevar_instance'.
%

category: 'Grail-Tests - TypeVar Is A Class'
method: FunctionTypeParamsTestCase
testTypeVarIsAClass
	"Stated directly as well as through isinstance: the isinstance check would
	also pass if TypeVar were some other class T happened to instantiate, and
	this names the property that actually changed."

	self assertCheckPasses: 'typevar_is_a_class'.
%

category: 'Grail-Tests - TypeVar Is A Class'
method: FunctionTypeParamsTestCase
testTypeVarStillAcceptsItsOldSignature
	"The function it replaced took constraints and keyword-only options, and call
	sites pass them.  A class whose __init__ dropped them would fail here rather
	than silently ignore them -- which is the failure mode that would have
	surfaced somewhere else entirely."

	self assertCheckPasses: 'typevar_still_accepts_its_old_signature'.
%

category: 'Grail-Tests - TypeVar Is A Class'
method: FunctionTypeParamsTestCase
testAParamSpecAndATypeVarTupleAreNotTypeVars
	"Why TypeVar SUBCLASSES _TypeVarInstance rather than renaming it.  A rename
	would have made every ParamSpec and TypeVarTuple answer True to
	isinstance(x, TypeVar), where CPython says False -- one wrong answer traded
	for another."

	self assertCheckPasses: 'a_paramspec_is_not_a_typevar'.
	self assertCheckPasses: 'a_typevartuple_is_not_a_typevar'.
%

category: 'Grail-Tests - Write Guards'
method: FunctionTypeParamsTestCase
testAssigningANonTupleIsRefused
	"Was ACCEPTED before: ``f.__type_params__ = 42'' stored the integer, so a
	later read handed a non-iterable to code that unpacks it.  The lambda case is
	separate because it is a different object reaching the same guard."

	self assertCheckPasses: 'assigning_a_non_tuple_is_refused'.
	self assertCheckPasses: 'assigning_a_non_tuple_to_a_lambda_is_refused'.
%

category: 'Grail-Tests - Write Guards'
method: FunctionTypeParamsTestCase
testDeletingTypeParamsIsRefused
	"NOT like __defaults__, whose delete is legal and clears it to None.  CPython
	routes this through the setter and has no clearing path, so the delete fails
	the tuple check and reports the SET message.  Before, it answered
	``AttributeError: __type_params__'' -- the wrong class AND the wrong claim,
	for an attribute every function has."

	self assertCheckPasses: 'deleting_type_params_is_refused'.
%

category: 'Grail-Tests - Write Guards'
method: FunctionTypeParamsTestCase
testAssigningATupleIsAllowed
	"The guard refuses a bad TYPE, not the attribute: a real tuple still writes
	through and reads back.  A guard that refused everything would pass both
	refusal tests above and be wrong."

	self assertCheckPasses: 'assigning_a_tuple_is_allowed_and_reads_back'.
%

set compile_env: 0
