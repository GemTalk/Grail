"
P1.2 PR 3 of the IR-only codegen plan: five refusal families lifted from CallAst
and ComprehensionAst -- `CallAst:super-keywords', `CallAst:super-noClass',
`CallAst:frameSensitive-{eval,exec}-bareRewrite' and
`CallAst:frameSensitive-{locals,vars,dir}' inside a comprehension in a def, and
`Comprehension:starTarget'.  One fixture per family, each self-running against
CPython 3.14 (scripts/check_python_fixtures.sh).

Three things are checked per fixture, because each alone proves too little:
  * under a FORCED IR load, every EXPECTED key answers CPython's value;
  * the eligibility census of that load names none of the retired rows and
    did compile defs -- the only instrument that sees an eligibility cut, since
    a refused def compiles as text and answers the same values;
  * every XFAIL key (a divergence the TEXT path has, recorded in the fixture
    with Grail's answer) answers that same value under IR -- so the IR arm
    reproduces the text rather than drifting to a third answer.
"
Class {
	#name : 'IRCallAndComprehensionShapesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'modules',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
IRCallAndComprehensionShapesTestCase >> ___assertAgreesWithCPython___: aFixture [
	"Every EXPECTED key, reported as the list of disagreeing keys: the failure
	that matters is WHICH shape broke."

	| mod r exp bad |
	mod := self ___irModuleFor___: aFixture.
	r := mod @env1:___pyAttrLoad___: #r.
	exp := mod @env1:___pyAttrLoad___: #EXPECTED.
	bad := OrderedCollection new.
	(exp @env1:keys) asArray do: [:k |
		| got want |
		got := (r @env1:__getitem__: k) @env0:asString.
		want := (exp @env1:__getitem__: k) @env0:asString.
		got = want ifFalse: [bad add: k asString , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: aFixture , ' disagrees with CPython under IR: ' , bad asArray printString

]

{ #category : 'Grail-Private' }
IRCallAndComprehensionShapesTestCase >> ___assertRowsGone___: rowNames in: aFixture [
	"Named rows, not a total: a count can stay level while a row MOVES to the
	next refusal one guard down, which reads as ``the cut did nothing''.  Both
	seams are checked -- a top-level def's row and a class-body method's
	``cm:'' twin."

	| counts present |
	counts := self ___censusCountsFor___: aFixture.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	present := OrderedCollection new.
	rowNames do: [:row |
		{ row. 'cm:' , row } do: [:each |
			(counts at: each asSymbol otherwise: 0) > 0 ifTrue: [
				present add: each , '=' , (counts at: each asSymbol) printString]]].
	self assert: present isEmpty
		description: 'a retired refusal is still in ' , aFixture , '''s census: '
			, present asArray printString.
	"...and the fixture's defs really did compile, so the absence above is not
	the absence of a MEASUREMENT."
	self assert: ((counts at: #compiled otherwise: 0)
			+ (counts at: #'cm:eligible' otherwise: 0)) > 1
		description: 'the census recorded nothing compiled for ' , aFixture

]

{ #category : 'Grail-Private' }
IRCallAndComprehensionShapesTestCase >> ___assertXfailsMatchText___: aFixture [
	"The fixture's XFAIL table holds GRAIL's answer for a shape where the text
	path diverges from CPython.  The IR arm must give that same answer: it is
	held to the text, and a third answer would be a new bug, not a fix."

	| mod r xf bad |
	mod := self ___irModuleFor___: aFixture.
	r := mod @env1:___pyAttrLoad___: #r.
	xf := mod @env1:___pyAttrLoad___: #XFAIL.
	bad := OrderedCollection new.
	(xf @env1:keys) asArray do: [:k |
		| got want |
		got := (r @env1:__getitem__: k) @env0:asString.
		want := (xf @env1:__getitem__: k) @env0:asString.
		got = want ifFalse: [bad add: k asString , ': ' , got , ' vs text ' , want]].
	self assert: bad isEmpty
		description: aFixture , ': the IR arm left the text''s recorded answer: '
			, bad asArray printString

]

{ #category : 'Grail-Private' }
IRCallAndComprehensionShapesTestCase >> ___censusCountsFor___: aFixture [
	"Load aFixture with the seam FORCED on AND the eligibility census
	collecting, under a module name of its own, and answer its #counts."

	| name |
	name := 'irccs_census_' , aFixture.
	(importlib @env1:modules) removeKey: name asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: name.
	self ___snapshotRegistry___.
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: (self ___fixturePath___: aFixture) name: name]
		ensure: [importlib ___irCensusOn: false].
	(importlib @env1:modules) removeKey: name asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: name.
	^ importlib ___irCensus___ at: #counts

]

{ #category : 'Grail-Private' }
IRCallAndComprehensionShapesTestCase >> ___fixturePath___: aFixture [
	^ importlib grailDir , '/tests/python/' , aFixture , '.py'

]

{ #category : 'Grail-Private' }
IRCallAndComprehensionShapesTestCase >> ___irModuleFor___: aFixture [
	"aFixture loaded with the seam FORCED on, once per test.  Forced rather
	than inherited: what this pins is an ELIGIBILITY widening, so a flag-off run
	exercises none of it and would pass unchanged."

	| name |
	modules ifNil: [modules := Dictionary new].
	(modules at: aFixture ifAbsent: [nil]) ifNotNil: [:m | ^ m].
	name := 'irccs_' , aFixture.
	(importlib @env1:modules) removeKey: name asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: name.
	self ___snapshotRegistry___.
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	^ modules at: aFixture
		put: (importlib loadModuleFromPath: (self ___fixturePath___: aFixture) name: name)

]

{ #category : 'Grail-Private' }
IRCallAndComprehensionShapesTestCase >> ___snapshotRegistry___ [
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___]

]

{ #category : 'Grail-Setup' }
IRCallAndComprehensionShapesTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	modules ifNotNil: [
		modules keysDo: [:fixture |
			| name |
			name := 'irccs_' , fixture.
			(importlib @env1:modules) removeKey: name asSymbol ifAbsent: [].
			self ___forgetCanonicalModule___: name]].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	modules := nil

]

{ #category : 'Grail-Tests - bare eval/exec in a comprehension' }
IRCallAndComprehensionShapesTestCase >> testBareEvalInAComprehensionAgreesWithCPythonUnderIR [
	"``[eval('x') for x in xs]'' in a def, the exec twin, nested and filtered
	comprehensions, a nested def, a method -- and the NameError for a name the
	comprehension never mentions."

	self ___assertAgreesWithCPython___: 'bare_eval_in_comprehension'

]

{ #category : 'Grail-Tests - bare eval/exec in a comprehension' }
IRCallAndComprehensionShapesTestCase >> testBareEvalInAComprehensionIsNoLongerRefused [
	self
		___assertRowsGone___: #('CallAst:frameSensitive-eval-bareRewrite'
			'CallAst:frameSensitive-exec-bareRewrite')
		in: 'bare_eval_in_comprehension'

]

{ #category : 'Grail-Tests - starred comprehension targets' }
IRCallAndComprehensionShapesTestCase >> testComprehensionStarTargetAgreesWithCPythonUnderIR [
	"The star first, last, in the middle, inside a nested tuple, wrapping one,
	over a string and an iterator, into a subscript and an attribute, in every
	comprehension kind."

	self ___assertAgreesWithCPython___: 'comprehension_star_target'

]

{ #category : 'Grail-Tests - starred comprehension targets' }
IRCallAndComprehensionShapesTestCase >> testComprehensionStarTargetIsNoLongerRefused [
	self ___assertRowsGone___: #('Comprehension:starTarget') in: 'comprehension_star_target'

]

{ #category : 'Grail-Tests - starred comprehension targets' }
IRCallAndComprehensionShapesTestCase >> testComprehensionStarTargetKeepsTheTextsShortUnpackError [
	"Too few values: CPython's ValueError, Grail's IndexError on BOTH paths
	(the comprehension has no value-count check, as the for-loop now does).
	Pinned so the IR arm cannot quietly start answering a third thing."

	self ___assertXfailsMatchText___: 'comprehension_star_target'

]

{ #category : 'Grail-Tests - locals/vars/dir in a comprehension' }
IRCallAndComprehensionShapesTestCase >> testLocalsInAComprehensionAgreesWithCPythonUnderIR [
	"PEP 709: the function's names plus the comprehension's own, a target
	shadowing a local, nested comprehensions, ``vars()'' and ``dir()''."

	self ___assertAgreesWithCPython___: 'locals_in_comprehension'

]

{ #category : 'Grail-Tests - locals/vars/dir in a comprehension' }
IRCallAndComprehensionShapesTestCase >> testLocalsInAComprehensionIsNoLongerRefused [
	self
		___assertRowsGone___: #('CallAst:frameSensitive-locals'
			'CallAst:frameSensitive-vars' 'CallAst:frameSensitive-dir')
		in: 'locals_in_comprehension'

]

{ #category : 'Grail-Tests - locals/vars/dir in a comprehension' }
IRCallAndComprehensionShapesTestCase >> testLocalsInAGeneratorExpressionKeepsTheTextsAnswer [
	"A generator expression is NOT inlined in CPython, so its locals() is its
	own frame's; Grail answers the function's on both paths."

	self ___assertXfailsMatchText___: 'locals_in_comprehension'

]

{ #category : 'Grail-Tests - super with keywords' }
IRCallAndComprehensionShapesTestCase >> testSuperWithAnEmptySplatKeepsTheTextsAnswer [
	"``super(**{})'' binds a proxy in CPython; Grail's text raises ``no
	arguments'', and the IR arm must say the same."

	self ___assertXfailsMatchText___: 'super_keyword_arguments'

]

{ #category : 'Grail-Tests - super with keywords' }
IRCallAndComprehensionShapesTestCase >> testSuperWithKeywordsAgreesWithCPythonUnderIR [
	"``super(x=1)'' and a full ``**'' splat raise CPython's TypeError from the
	builtin; a working super() beside one in the same method is untouched."

	self ___assertAgreesWithCPython___: 'super_keyword_arguments'

]

{ #category : 'Grail-Tests - super with keywords' }
IRCallAndComprehensionShapesTestCase >> testSuperWithKeywordsIsNoLongerRefused [
	self ___assertRowsGone___: #('CallAst:super-keywords') in: 'super_keyword_arguments'

]

{ #category : 'Grail-Tests - super with no class' }
IRCallAndComprehensionShapesTestCase >> testSuperWithoutAClassAgreesWithCPythonUnderIR [
	"The three precondition messages, from top-level and nested defs, with a
	first parameter spelled ``self'' or ``nil'' (renamed temps), deleted, or
	absent."

	self ___assertAgreesWithCPython___: 'super_without_class'

]

{ #category : 'Grail-Tests - super with no class' }
IRCallAndComprehensionShapesTestCase >> testSuperWithoutAClassInALambdaKeepsTheTextsAnswer [
	"A super() in a lambda consults the enclosing DEF's parameters on both
	Grail paths, so the two messages come out swapped against CPython."

	self ___assertXfailsMatchText___: 'super_without_class'

]

{ #category : 'Grail-Tests - super with no class' }
IRCallAndComprehensionShapesTestCase >> testSuperWithoutAClassIsNoLongerRefused [
	"super_precondition_errors.py is the older fixture of the same family; its
	module-level defs are the shape this cut admits, so it is held to the same
	census."

	self ___assertRowsGone___: #('CallAst:super-noClass') in: 'super_without_class'.
	self ___assertRowsGone___: #('CallAst:super-noClass') in: 'super_precondition_errors'

]
