Class {
	#name : 'ReprAndVarsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ReprAndVarsTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
ReprAndVarsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'repr_and_vars' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/repr_and_vars.py')
		name: 'repr_and_vars'.

]

{ #category : 'Grail-Tests - repr with surrogates' }
ReprAndVarsTestCase >> testEachEscapeClassSurvivesASurrogate [
	"One escape class at a time, each WITH a surrogate in the string, so a
	partial fix is visible.  The combined string below exercises them together;
	these say which one moved."

	#('nul' 'newline' 'cr' 'tab' 'backslash' 'x85' 'u1fff' 'astral'
	  'printable_nonascii') do: [:k |
		self assertMatchesCPythonAt: 'surrogate_with_' , k].

]

{ #category : 'Grail-Tests - Controls' }
ReprAndVarsTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '27 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - Controls' }
ReprAndVarsTestCase >> testOrdinaryReprIsUnchanged [
	"THE CONTROL for extracting the rule: a string with no surrogate takes the
	same method it always did, and must render identically."

	self assertMatchesCPythonAt: 'plain_reprs'.
	self assertMatchesCPythonAt: 'nested_reprs'.

]

{ #category : 'Grail-Tests - Controls' }
ReprAndVarsTestCase >> testOrdinaryVarsIsUnchanged [
	"The control for the __dict__ gate: it is on the type DECLARING the name,
	so an ordinary instance still takes the instVar walk, and the frame forms
	still answer the caller's locals."

	self assertMatchesCPythonAt: 'vars_plain_instance'.
	self assertMatchesCPythonAt: 'vars_empty_frame'.
	self assertMatchesCPythonAt: 'vars_frame_locals'.
	self assertMatchesCPythonAt: 'vars_too_many_args'.
	self assertMatchesCPythonAt: 'vars_non_object'.

]

{ #category : 'Grail-Tests - repr with surrogates' }
ReprAndVarsTestCase >> testTheCombinedStringFromTestAscii [
	"The exact string test_builtin test_ascii builds -- a quote, a NUL, a
	double quote, the three whitespace escapes, a non-printable, a printable
	non-ASCII, an astral character, a lone surrogate and an astral character
	again."

	self assertMatchesCPythonAt: 'combined_repr'.
	self assertMatchesCPythonAt: 'combined_ascii'.
	self assertMatchesCPythonAt: 'ascii_equals_repr'.

]

{ #category : 'Grail-Tests - repr with surrogates' }
ReprAndVarsTestCase >> testTheDelimiterIsChosenTheSameWay [
	"Single quotes unless the string holds a single quote and no double quote,
	so the delimiter need not be escaped.  The surrogate repr always used a
	single quote -- a separate rule, in the copy nobody maintained."

	self assertMatchesCPythonAt: 'surrogate_quote_single'.
	self assertMatchesCPythonAt: 'surrogate_quote_double'.
	self assertMatchesCPythonAt: 'surrogate_quote_both'.

]

{ #category : 'Grail-Tests - vars' }
ReprAndVarsTestCase >> testVarsAndDirAgreeForAModule [
	"The membership row is the one that explains why this went unnoticed: a
	name that ``in'' finds must also be ENUMERATED, and for sys's 32
	Smalltalk-implemented functions it was not -- so every check that asked
	about one name agreed, and only a set comparison disagreed."

	self assertMatchesCPythonAt: 'vars_matches_dir_for_sys'.
	self assertMatchesCPythonAt: 'membership_agrees_with_enumeration'.
	self assertMatchesCPythonAt: 'sys_functions_enumerated'.

]

{ #category : 'Grail-Tests - vars' }
ReprAndVarsTestCase >> testVarsHonoursATypesOwnDict [
	"vars(obj) IS obj.__dict__, not an enumeration that usually agrees with
	it.  A class whose __dict__ is a property answered {} from vars() while
	obj.__dict__ answered the property's value -- the last row asserts the two
	now agree, which is the property rather than either value."

	self assertMatchesCPythonAt: 'vars_honours_own_dict'.
	self assertMatchesCPythonAt: 'vars_is_dict_attribute'.

]
