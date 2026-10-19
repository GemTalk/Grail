"A builtin str method called with its arguments by keyword.

``'ab'.replace(old='a', new='b')' should be a TypeError, as it is in
CPython.  In Grail ``_replace: positional kw:' reads ``old' and ``new' from
the positional array with no bounds check and no kwargs fallback, so the call
indexes past the end and the SESSION DIES with an uncatchable OffsetError
(2003, objErrBadOffsetIncomplete).

jinja2 reaches it because compile() answers source text, not a code object:
``code.replace(co_name=...)' in fake_traceback() lands on str.replace.  That
puts the crash on jinja2's ERROR-REPORTING path, so a template naming an
unknown filter kills the gem instead of raising TemplateAssertionError.

Fixed by bounds-checking the positional array and raising CPython's
TypeError.  ``old'/``new' stay positional-only and ``count' keeps its
keyword spelling, so nothing that worked before changes.

See tests/python/str_method_keyword_args.py."
Class {
	#name : 'StrMethodKeywordArgsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
StrMethodKeywordArgsTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Tests - Why jinja2 no longer reaches it' }
StrMethodKeywordArgsTestCase >> assertFalseAt: key [
	| v |
	v := self resultAt: key.
	self assert: v == false description: key , ' -> ' , v printString

]

{ #category : 'Grail-Helpers' }
StrMethodKeywordArgsTestCase >> assertTypeErrorAt: aKey [
	"The fixture records a raise as the triple ('raised', ExcName, message)."

	| v |
	v := self resultAt: aKey.
	self assert: (v @env1:__getitem__: 0) = 'raised'
		description: aKey , ' did not raise: ' , v printString.
	self assert: (v @env1:__getitem__: 1) = 'TypeError'
		description: aKey , ' raised the wrong type: ' , v printString

]

{ #category : 'Grail-Helpers' }
StrMethodKeywordArgsTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
StrMethodKeywordArgsTestCase >> setUp [
	"Reload tests/python/str_method_keyword_args.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'str_method_keyword_args' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_method_keyword_args.py')
		name: 'str_method_keyword_args'.

]

{ #category : 'Grail-Tests - Why jinja2 no longer reaches it' }
StrMethodKeywordArgsTestCase >> testCompileAnswersACodeObjectWithItsOwnReplace [
	"THIS METHOD USED TO ASSERT THE OPPOSITE, and it was written to.

	compile() answered source TEXT, so its result had no ``co_name'' and DID
	have ``replace'' -- str's.  That collision is what turned jinja2's
	``code.replace(co_name=location)'' into a keyword-only call on a string,
	and the note here said: if compile() ever answers a real code object these
	break HERE rather than quietly moving jinja2 onto a different method.

	It did, and this is that change.  compile() answers a code object carrying
	its source; the code object has co_name, co_filename and a ``replace'' of
	its own, so the call lands where jinja2 meant it to."

	self assertFalseAt: 'compile_answers_a_str'.
	self assertAll: #('compiled_has_co_name' 'compiled_has_replace').
	self
		assert: (self resultAt: 'compiled_co_filename') asString
		equals: '<fixture>'

]

{ #category : 'Grail-Tests - What still works' }
StrMethodKeywordArgsTestCase >> testCountIsReadFromKwargs [
	"``count'' survives a keyword call because ``_replace:'' looks it up in
	kwargs by name.  That is the evidence the kwargs dict is reachable at this
	call site, so ``old''/``new'' ignoring it is an oversight rather than a
	limitation.  CPython refuses this spelling; the divergence is recorded in
	the fixture, not endorsed here."

	self assertAll: #('replace_count_keyword')

]

{ #category : 'Grail-Tests - The regression' }
StrMethodKeywordArgsTestCase >> testTheFormerlyFatalKeywordCallsAreTypeErrors [
	"The regression test for this fix, and the reason the whole case exists.

	Each of these three ENDED THE SESSION before ``_replace:'' bounds-checked
	its positional array -- not failed, ended, with error 2003
	objErrBadOffsetIncomplete and no traceback.  Running one of them here would
	have aborted the entire suite rather than reporting a failure, which is why
	this method used to be named ``probeTheFatalKeywordCalls'' and was
	deliberately not collected by SUnit.

	It is collected now.  If ``_replace:'' loses its bounds check, this test
	does not go red -- it takes the run down, and that is itself the signal.

	The third is jinja2/debug.py:122 exactly: a keyword-only ``replace'' on
	what jinja2 believes is a code object and Grail answers as source text."

	self assertTypeErrorAt: 'all_keywords'.        "was max:0 actual:1"
	self assertTypeErrorAt: 'partial_keyword'.     "was max:1 actual:2"
	"THE THIRD NO LONGER RAISES, and that is the fix rather than a regression.
	It is jinja2/debug.py:122 exactly, and it only ever landed on str.replace
	because compile() answered text.  Now that compile() answers a code object
	with its own ``replace'', the call does what jinja2 wrote it to do: answer
	a copy named for the template.  The row is kept here, beside the two calls
	that still raise, because it is the same line -- what changed is which
	method it reaches."
	self
		assert: (self resultAt: 'as_jinja2_calls_it') asString
		equals: 'template'

]

{ #category : 'Grail-Tests - What still works' }
StrMethodKeywordArgsTestCase >> testThePositionalFormsAreUnaffected [
	"The two- and three-argument positional calls are the ones the defect must
	not disturb; a bounds check in ``_replace:'' has to leave these alone."

	self assertAll: #('replace_two_positional' 'replace_three_positional')

]
