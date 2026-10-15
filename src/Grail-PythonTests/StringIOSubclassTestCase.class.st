Class {
	#name : 'StringIOSubclassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
StringIOSubclassTestCase >> assertMatchesCPythonAt: key [
	| b r expected |
	b := builtins @env1:instance.
	r := testModule @env1:___pyAttrLoad___: #r.
	expected := testModule @env1:___pyAttrLoad___: #EXPECTED.
	self
		assert: (b @env1:repr: (r @env1:__getitem__: key)) asString
		equals: (b @env1:repr: (expected @env1:__getitem__: key)) asString

]

{ #category : 'Grail-Setup' }
StringIOSubclassTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'stringio_subclass' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/stringio_subclass.py')
		name: 'stringio_subclass'.

]

{ #category : 'Grail-Tests - an override that calls the base' }
StringIOSubclassTestCase >> testAnOverrideThatCallsTheBaseRunsOnce [
	"read/readline/truncate/seek supply their default argument in a short
	form, and Grail's used to do it by self-sending the long form -- which a
	Python override replaces too.  So ``io.StringIO.truncate(self)'' inside an
	override of truncate re-entered the override until RecursionError; that is
	what doctest's _SpoofOut does.  Each override tags its result, so a match
	shows it ran once and the base did the work."

	#('override_read' 'override_readline' 'override_truncate' 'override_seek'
	  'override_bytes_read' 'override_bytes_readline' 'override_bytes_truncate'
	  'override_bytes_seek')
		do: [:key | self assertMatchesCPythonAt: key].

]

{ #category : 'Grail-Tests - a plain subclass' }
StringIOSubclassTestCase >> testAPlainSubclassIsConstructed [
	"The rows that say where the fault actually was: no __getattribute__, no
	methods at all, and the buffer was never set."

	self assertMatchesCPythonAt: 'str_getvalue'.
	self assertMatchesCPythonAt: 'str_read'.
	self assertMatchesCPythonAt: 'str_readline'.
	self assertMatchesCPythonAt: 'str_empty'.
	self assertMatchesCPythonAt: 'bytes_getvalue'.
	self assertMatchesCPythonAt: 'bytes_empty'.

]

{ #category : 'Grail-Tests - Controls' }
StringIOSubclassTestCase >> testEveryCheckIsPresentAndAgreesWithCPython [
	"The tests above name their keys, so a DELETED check stops being asserted
	and nothing goes red.  This reads the fixture's own roll-up."

	self
		assert: ((testModule @env1:___pyAttrLoad___: #SUMMARY) asString)
		equals: '24 checks, 0 disagreeing [], keys match: True'

]

{ #category : 'Grail-Tests - a plain subclass' }
StringIOSubclassTestCase >> testItBehavesLikeTheBase [
	"Writing, the closed flag, the type and isinstance -- everything that
	reads the state __new__ was supposed to set."

	self assertMatchesCPythonAt: 'str_write_then_read'.
	self assertMatchesCPythonAt: 'str_closed_flag'.
	self assertMatchesCPythonAt: 'type_is_the_subclass'.
	self assertMatchesCPythonAt: 'isinstance_of_base'.

]

{ #category : 'Grail-Tests - Controls' }
StringIOSubclassTestCase >> testTheBaseClassesAreUndisturbed [
	"The routing is reached only by a SUBCLASS with no __init__ of its own,
	so the base classes and a subclass that does define one must behave
	exactly as before."

	self assertMatchesCPythonAt: 'plain_stringio'.
	self assertMatchesCPythonAt: 'plain_bytesio'.
	self assertMatchesCPythonAt: 'subclass_with_init'.
	self assertMatchesCPythonAt: 'one_argument_is_enough'.

]

{ #category : 'Grail-Tests - the shape the test uses' }
StringIOSubclassTestCase >> testTheGh130163Shape [
	"A subclass with a __getattribute__ that re-patches sys.stdout, stderr
	and stdin in the middle of input()'s read.  It was blamed for the crash;
	it was never the cause."

	self assertMatchesCPythonAt: 'getattribute_subclass'.
	self assertMatchesCPythonAt: 'gh130163'.

]
