! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ReprAndVarsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ReprAndVarsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ReprAndVarsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ReprAndVarsTestCase
!
! Two rules that each existed TWICE, with only one copy maintained.
!
! REPR OF A STRING HOLDING A LONE SURROGATE.  Grail switches such a string to a
! different CLASS (PyStrSurrogate) the moment it holds one, and that class had
! its own repr, written separately.  It emitted every non-surrogate code point
! VERBATIM, so a string containing both a surrogate and a control character
! came back with a real NUL, a real newline and a real tab in it -- while the
! same string WITHOUT the surrogate escaped all three, because that one took
! CharacterCollection's repr.  It also always used a single quote and escaped
! it, where CPython switches to double quotes when that avoids the escape.
!
! The per-code-point rule is now ONE method both call
! (___pyReprEscapeCodePoint___:quote:on:).  Each escape class is probed WITH a
! surrogate present, one at a time, so a partial fix shows up rather than being
! averaged away by the combined string.
!
! VARS AND DIR MUST AGREE.  CPython's vars(obj) IS obj.__dict__, and dir(m) is
! derived from it, so the two agree by construction.  Grail computed them from
! different filters over the module class's methods: __dir__ EXCLUDED two
! artifact categories, while ___globalNames___ REQUIRED the category
! Python-defined modules compile into.  Modules written in SMALLTALK -- sys
! among them -- keep their functions in hand-written categories, so 32 of sys's
! 82 names were reported by dir() and by getattr and NOT by vars(sys) /
! sys.__dict__ / globals().
!
! Worse than missing, and the row that says so: PyModuleDict answers ``in''
! from the attribute chain rather than from that list, so ``'exit' in
! vars(sys)'' was TRUE while ``'exit' in set(vars(sys))'' was False.  A
! membership test and an enumeration of the same mapping disagreed, which is
! why the count looked right from every angle that asked about one name.
!
! vars(obj) also ignored a type that supplies its own __dict__: a class whose
! __dict__ is a property answered {} from vars() while obj.__dict__ answered
! the property's value.  Gated on the type DECLARING the name, because every
! object can be asked for __dict__ and ordinary ones fall through to a
! synthesized view or a method wrap.
!
! Drives tests/python/repr_and_vars.py, whose EXPECTED table was measured by
! RUNNING CPython 3.14.6.
!
! test_builtin's test_ascii and test_vars.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
ReprAndVarsTestCase removeAllMethods.
ReprAndVarsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ReprAndVarsTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'repr_and_vars' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/repr_and_vars.py')
		name: 'repr_and_vars'.
%

category: 'Grail-Private'
method: ReprAndVarsTestCase
assertMatchesCPythonAt: key
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString
%

category: 'Grail-Tests - repr with surrogates'
method: ReprAndVarsTestCase
testEachEscapeClassSurvivesASurrogate
	"One escape class at a time, each WITH a surrogate in the string, so a
	partial fix is visible.  The combined string below exercises them together;
	these say which one moved."

	#('nul' 'newline' 'cr' 'tab' 'backslash' 'x85' 'u1fff' 'astral'
	  'printable_nonascii') do: [:k |
		self assertMatchesCPythonAt: 'surrogate_with_' , k].
%

category: 'Grail-Tests - repr with surrogates'
method: ReprAndVarsTestCase
testTheCombinedStringFromTestAscii
	"The exact string test_builtin test_ascii builds -- a quote, a NUL, a
	double quote, the three whitespace escapes, a non-printable, a printable
	non-ASCII, an astral character, a lone surrogate and an astral character
	again."

	self assertMatchesCPythonAt: 'combined_repr'.
	self assertMatchesCPythonAt: 'combined_ascii'.
	self assertMatchesCPythonAt: 'ascii_equals_repr'.
%

category: 'Grail-Tests - repr with surrogates'
method: ReprAndVarsTestCase
testTheDelimiterIsChosenTheSameWay
	"Single quotes unless the string holds a single quote and no double quote,
	so the delimiter need not be escaped.  The surrogate repr always used a
	single quote -- a separate rule, in the copy nobody maintained."

	self assertMatchesCPythonAt: 'surrogate_quote_single'.
	self assertMatchesCPythonAt: 'surrogate_quote_double'.
	self assertMatchesCPythonAt: 'surrogate_quote_both'.
%

category: 'Grail-Tests - Controls'
method: ReprAndVarsTestCase
testOrdinaryReprIsUnchanged
	"THE CONTROL for extracting the rule: a string with no surrogate takes the
	same method it always did, and must render identically."

	self assertMatchesCPythonAt: 'plain_reprs'.
	self assertMatchesCPythonAt: 'nested_reprs'.
%

category: 'Grail-Tests - vars'
method: ReprAndVarsTestCase
testVarsAndDirAgreeForAModule
	"The membership row is the one that explains why this went unnoticed: a
	name that ``in'' finds must also be ENUMERATED, and for sys's 32
	Smalltalk-implemented functions it was not -- so every check that asked
	about one name agreed, and only a set comparison disagreed."

	self assertMatchesCPythonAt: 'vars_matches_dir_for_sys'.
	self assertMatchesCPythonAt: 'membership_agrees_with_enumeration'.
	self assertMatchesCPythonAt: 'sys_functions_enumerated'.
%

category: 'Grail-Tests - vars'
method: ReprAndVarsTestCase
testVarsHonoursATypesOwnDict
	"vars(obj) IS obj.__dict__, not an enumeration that usually agrees with
	it.  A class whose __dict__ is a property answered {} from vars() while
	obj.__dict__ answered the property's value -- the last row asserts the two
	now agree, which is the property rather than either value."

	self assertMatchesCPythonAt: 'vars_honours_own_dict'.
	self assertMatchesCPythonAt: 'vars_is_dict_attribute'.
%

category: 'Grail-Tests - Controls'
method: ReprAndVarsTestCase
testOrdinaryVarsIsUnchanged
	"The control for the __dict__ gate: it is on the type DECLARING the name,
	so an ordinary instance still takes the instVar walk, and the frame forms
	still answer the caller's locals."

	self assertMatchesCPythonAt: 'vars_plain_instance'.
	self assertMatchesCPythonAt: 'vars_empty_frame'.
	self assertMatchesCPythonAt: 'vars_frame_locals'.
	self assertMatchesCPythonAt: 'vars_too_many_args'.
	self assertMatchesCPythonAt: 'vars_non_object'.
%

category: 'Grail-Tests - Controls'
method: ReprAndVarsTestCase
testEveryCheckIsPresentAndAgreesWithCPython
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '27 checks, 0 disagreeing [], keys match: True'
%
