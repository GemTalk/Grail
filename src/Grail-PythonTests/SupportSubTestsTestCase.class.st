"``test.support.subTests' -- CPython 3.14's parameterising decorator.

Grail's test.support is a hand-written SUBSET rather than a vendored
copy, and this helper was simply absent.  A missing decorator is not an
import error: the name resolved, the decoration did not happen, and the
undecorated method stayed in place with its extra parameters -- so
unittest called it with only ``self' and every one failed with ``missing
1 required positional argument'.  Thirteen tests in test_htmlparser, all
reading like a signature bug in the tests themselves rather than a gap in
the harness.

The decorator rewrites a method into a loop calling the original once per
parameter set inside self.subTest(), passing the values as KEYWORDS.  One
name may be given as a single string (comma-separated for several), and
the one-name spelling takes bare values rather than tuples, which is the
shape test_htmlparser uses throughout.  Carried verbatim from CPython
3.14 rather than reimplemented.

test.test_htmlparser 19 -> 7, and its test COUNT rose 55 -> 67 as the
subtests materialised.  What remains there is six real html.parser
charref differences and one @mock.patch decorator, a separate gap.

See tests/python/support_subtests.py (6 checks, CPython-validated first)."
Class {
	#name : 'SupportSubTestsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
SupportSubTestsTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Helpers' }
SupportSubTestsTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
SupportSubTestsTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'support_subtests' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/support_subtests.py')
		name: 'support_subtests'.

]

{ #category : 'Grail-Tests' }
SupportSubTestsTestCase >> testReportingAndIdentity [
	"A failing subtest is reported without stopping the others, the
	wrapper keeps the original name unittest reports by, and decorating a
	CLASS is refused."

	self assertAll: #('a_failing_subtest_is_reported'
		'wrapper_keeps_the_name' 'decorating_a_class_is_refused')

]

{ #category : 'Grail-Tests' }
SupportSubTestsTestCase >> testTheDecoratorParameterises [
	"One name with bare values, several names with tuples, and an empty
	value list -- which runs the body never while still counting as one
	test."

	self assertAll: #('single_param_runs_once_per_value'
		'multiple_names_take_tuples'
		'an_empty_value_list_runs_the_body_never')

]
