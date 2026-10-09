! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for Env1PlumbingSendsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'Env1PlumbingSendsTestCase'
  instVarNames: #(textModule irModule irCensus sessionModule registrySnapshot)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
Env1PlumbingSendsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! Env1PlumbingSendsTestCase - generated code keeps Grail's plumbing out of env 1
! under Python-shaped selectors (issue #1155), and the public reader built on
! that guarantee:
!     BaseException class >> pythonSelectorsSentBy:
!
! A sender search over a compiled Python method sees _selectorPool, which
! merges both environments.  Filtering it to env 1 separates Python calls from
! Grail's own env-0 checks (``@env0:size'') -- but only if Grail never sends its
! plumbing in env 1 under a name pythonNameOfSelector: decodes.  It did:
! ``(builtins) instance'', literal-block ``[...] value'', ``___s add:'',
! ``___d update:'', ``___ex___ returnValue'', and ``___ignore:'' /
! ``___mergePublicAttrsFrom:'' (which begin with ___ but do not end with it).
!
! The fixture, tests/python/env1_plumbing_sends.py, spells every name it uses
! ``zz_...''.  So any other non-dunder Python name decoded from an env-1 send of
! its methods is plumbing.  Both codegen arms are checked:
!   * text: the env-1 sends are the ones not spelled @env0: in the generated
!     text -- exactly what pythonSelectorsSentBy: reads;
!   * IR: there is no text, so the arm reads importlib >> ___irSendCensus___,
!     the { selector. envId } the builder asked for, intersected with the
!     method's _selectorPool (inlined control flow -- ifTrue:, and: -- is built
!     as an env-1 send node but compiles to no send at all).
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
Env1PlumbingSendsTestCase removeAllMethods: 0.
Env1PlumbingSendsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: Env1PlumbingSendsTestCase
setUp
	"Each module is imported cold on first use, with the IR seam FORCED its
	own way -- see PythonCallSitePositionsTestCase >> setUp for why forced and
	why cold."

	| mods |
	mods := importlib @env1:modules.
	self ___moduleNames___ do: [:n |
		mods removeKey: n asSymbol ifAbsent: [].
		self ___forgetCanonicalModule___: n].
	registrySnapshot := importlib ___canonicalRegistrySnapshot___.
	textModule := nil.
	irModule := nil.
	irCensus := nil.
	sessionModule := nil.
%

category: 'Grail-Setup'
method: Env1PlumbingSendsTestCase
tearDown
	| mods |
	importlib ___irSendCensusOn: false.
	importlib ___irCodegenEnabledInvalidate___.
	mods := importlib @env1:modules.
	self ___moduleNames___ do: [:n | mods removeKey: n asSymbol ifAbsent: []].
	registrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		registrySnapshot := nil].
	self ___moduleNames___ do: [:n | self ___forgetCanonicalModule___: n].
	textModule := nil.
	irModule := nil.
	irCensus := nil.
	sessionModule := nil.
%

category: 'Grail-Private'
method: Env1PlumbingSendsTestCase
___moduleNames___
	^ #('env1_plumbing_text' 'env1_plumbing_ir' 'grail_session_text')
%

category: 'Grail-Private'
method: Env1PlumbingSendsTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/env1_plumbing_sends.py'
%

category: 'Grail-Private'
method: Env1PlumbingSendsTestCase
___textModule___
	"The fixture with the IR seam forced OFF: every method is generated text."

	textModule ifNil: [
		importlib ___irCodegenForce___: false.
		textModule := importlib loadModuleFromPath: self ___fixturePath___
			name: 'env1_plumbing_text'].
	^ textModule
%

category: 'Grail-Private'
method: Env1PlumbingSendsTestCase
___irModule___
	"The fixture with the IR seam forced ON, recording the send census while it
	compiles.  The census is kept and recording stopped at once, so nothing
	else this test does adds to it."

	irModule ifNil: [
		importlib ___irCodegenForce___: true.
		importlib ___irSendCensusOn: true.
		[irModule := importlib loadModuleFromPath: self ___fixturePath___
			name: 'env1_plumbing_ir'.
		 irCensus := importlib ___irSendCensus___]
			ensure: [importlib ___irSendCensusOn: false]].
	^ irModule
%

category: 'Grail-Private'
method: Env1PlumbingSendsTestCase
___sessionModule___
	"stdlib _grail_session with the IR seam forced OFF -- the module issue
	#1155's acceptance criteria name."

	sessionModule ifNil: [
		importlib ___irCodegenForce___: false.
		sessionModule := importlib
			loadModuleFromPath: importlib grailDir , '/src/python/stdlib/_grail_session.py'
			name: 'grail_session_text'].
	^ sessionModule
%

category: 'Grail-Private'
method: Env1PlumbingSendsTestCase
___classesOf___: aModule names: classNames
	"aModule's own class and the named classes it defines, each with its
	metaclass: every behavior the fixture's methods are compiled into."

	| out |
	out := OrderedCollection new.
	({ aModule class } , (classNames collect: [:n | aModule @env1:__getattribute__: n]))
		do: [:c | out add: c; add: c class].
	^ out
%

category: 'Grail-Private'
method: Env1PlumbingSendsTestCase
___fixtureBehaviorsOf___: aModule
	^ self ___classesOf___: aModule
		names: #('zz_Meta' 'zz_Base' 'zz_C' 'zz_Err1' 'zz_Err2')
%

category: 'Grail-Private'
method: Env1PlumbingSendsTestCase
___methodsOf___: behaviors kind: aKind
	"behavior -> env-1 selector -> method, for the methods whose
	pythonPositionKindForMethod: is aKind."

	| out |
	out := OrderedCollection new.
	behaviors do: [:b |
		(b selectorsForEnvironment: 1) do: [:sel |
			| m |
			m := b compiledMethodAt: sel environmentId: 1 otherwise: nil.
			(m notNil and: [(BaseException pythonPositionKindForMethod: m) == aKind])
				ifTrue: [out add: { b. sel. m }]]].
	^ out
%

category: 'Grail-Private'
method: Env1PlumbingSendsTestCase
___isFixtureName___: aSelector
	"True iff aSelector decodes to a name the fixture itself uses: one spelled
	zz_..., or a dunder (an operator lowered to its protocol send)."

	| n |
	n := importlib pythonNameOfSelector: aSelector.
	n isNil ifTrue: [^ true].
	(n indexOfSubCollection: 'zz_') = 1 ifTrue: [^ true].
	^ n size > 4
		and: [(n copyFrom: 1 to: 2) = '__'
		and: [(n copyFrom: n size - 1 to: n size) = '__']]
%

category: 'Grail-Private'
method: Env1PlumbingSendsTestCase
___decodes___: aSelector to: aName
	^ (importlib pythonNameOfSelector: aSelector) = aName
%

category: 'Grail-Tests-Env1Plumbing'
method: Env1PlumbingSendsTestCase
testTextArmSendsNoPlumbingUnderPythonNames
	"Every env-1 send of every text method, as pythonSelectorsSentBy: reads
	them, decodes to a name the fixture uses -- or to nothing."

	| methods bad |
	methods := self ___methodsOf___: (self ___fixtureBehaviorsOf___: self ___textModule___)
		kind: #curPos.
	self assert: methods size >= 10
		description: 'the text arm must not pass vacuously: ' , methods size printString , ' text methods'.
	bad := OrderedCollection new.
	methods do: [:e |
		((BaseException pythonSelectorsSentBy: (e at: 3)) reject: [:s | self ___isFixtureName___: s])
			do: [:s | bad add: (e at: 1) name , '>>' , (e at: 2) , ' sends ' , s]].
	self assert: bad isEmpty
		description: 'plumbing sent in env 1 under a Python name: ' , bad asArray printString
%

category: 'Grail-Tests-Env1Plumbing'
method: Env1PlumbingSendsTestCase
testTextArmReportsCallsIncludingInnerBlocks
	"The positive half: the fixture's own direct calls ARE reported --
	self.zz_helper(...) in zz_call, and the same call inside a lambda (an
	inner block) in zz_m."

	| zzC |
	zzC := self ___textModule___ @env1:__getattribute__: 'zz_C'.
	#(#zz_call #'zz_m:') do: [:sel |
		self assert: ((BaseException pythonSelectorsSentBy:
				(zzC compiledMethodAt: sel environmentId: 1))
			anySatisfy: [:s | self ___decodes___: s to: 'zz_helper'])
			description: sel , ' does not report zz_helper']
%

category: 'Grail-Tests-Env1Plumbing'
method: Env1PlumbingSendsTestCase
testTextArmExcludesEnvZeroSends
	"The control for the filter: some text method's _selectorPool holds a
	Python-shaped selector -- Grail's @env0: plumbing -- that
	pythonSelectorsSentBy: leaves out.  Without one, the two tests above could
	pass on a reader that never looked at the environment."

	| methods excluded |
	methods := self ___methodsOf___: (self ___fixtureBehaviorsOf___: self ___textModule___)
		kind: #curPos.
	excluded := Set new.
	methods do: [:e |
		| sent |
		sent := BaseException pythonSelectorsSentBy: (e at: 3).
		((e at: 3) _selectorPool select: [:s |
			(importlib pythonNameOfSelector: s) notNil and: [(sent includes: s) not]])
				do: [:s | excluded add: s]].
	self assert: (excluded includes: #value)
		description: 'expected @env0:value to be pooled and excluded; excluded: ' , excluded asArray printString
%

category: 'Grail-Tests-Env1Plumbing'
method: Env1PlumbingSendsTestCase
testIRArmSendsNoPlumbingUnderPythonNames
	"The IR arm through the builder's census: every env-1 send node that
	compiled to a real send decodes to a name the fixture uses."

	| bad irMethods |
	self ___irModule___.
	self assert: irCensus notNil.
	irMethods := 0.
	bad := OrderedCollection new.
	irCensus do: [:entry |
		| m pool |
		m := (entry at: 1) compiledMethodAt: (entry at: 2) environmentId: 1 otherwise: nil.
		(m notNil and: [(BaseException pythonPositionKindForMethod: m) == #irSource]) ifTrue: [
			irMethods := irMethods + 1.
			pool := m _selectorPool.
			(entry at: 3) do: [:send |
				((send at: 2) = 1
					and: [(pool includes: (send at: 1))
					and: [(self ___isFixtureName___: (send at: 1)) not]])
						ifTrue: [bad add: (entry at: 1) name , '>>' , (entry at: 2) , ' sends ' , (send at: 1)]]]].
	self assert: irMethods >= 5
		description: 'the IR arm must not pass vacuously: ' , irMethods printString , ' IR methods'.
	self assert: bad isEmpty
		description: 'plumbing sent in env 1 under a Python name: ' , bad asArray printString
%

category: 'Grail-Tests-Env1Plumbing'
method: Env1PlumbingSendsTestCase
testIRArmCensusRecordsPythonCalls
	"The census sees the fixture's own env-1 calls, so the test above is
	reading real data: zz_call's self.zz_helper(1)."

	| entry |
	self ___irModule___.
	entry := irCensus detect: [:e | (e at: 2) == #zz_call] ifNone: [nil].
	self assert: entry notNil description: 'zz_call was not built as IR'.
	self assert: ((entry at: 3) anySatisfy: [:send |
		(send at: 2) = 1 and: [self ___decodes___: (send at: 1) to: 'zz_helper']])
		description: 'no env-1 zz_helper send in ' , (entry at: 3) asArray printString
%

category: 'Grail-Tests-Env1Plumbing'
method: Env1PlumbingSendsTestCase
testIRMethodAnswersUnknown
	"Until the kernel can say which environment a send targets, an IR method
	answers nil -- unknown -- rather than a guess."

	| m |
	m := self ___irModule___ class compiledMethodAt: #'_zz_f:kw:' environmentId: 1.
	self assert: (BaseException pythonPositionKindForMethod: m) == #irSource.
	self assert: (BaseException pythonSelectorsSentBy: m) isNil
%

category: 'Grail-Tests-Env1Plumbing'
method: Env1PlumbingSendsTestCase
testNonPythonMethodsAnswerEmpty
	self assert: (BaseException pythonSelectorsSentBy: nil) isEmpty.
	self assert: (BaseException pythonSelectorsSentBy:
		(Object compiledMethodAt: #printString environmentId: 0)) isEmpty
%

category: 'Grail-Tests-Env1Plumbing'
method: Env1PlumbingSendsTestCase
testGrailSessionAcceptance
	"Issue #1155's acceptance criteria, on the text arm: no SessionDict method
	reports size, at:, class, printString, value or new -- all of them Grail's
	env-0 argument checks -- and the twelve methods that call self._dict()
	report it."

	| cls methods callers bad |
	cls := self ___sessionModule___ @env1:__getattribute__: 'SessionDict'.
	methods := self ___methodsOf___: { cls. cls class } kind: #curPos.
	self assert: methods size >= 12.
	bad := OrderedCollection new.
	callers := 0.
	methods do: [:e |
		| sent |
		sent := BaseException pythonSelectorsSentBy: (e at: 3).
		(sent select: [:s | #(#size #at: #class #printString #value #new) includes: s])
			do: [:s | bad add: (e at: 2) , ' sends ' , s].
		(sent anySatisfy: [:s | self ___decodes___: s to: '_dict'])
			ifTrue: [callers := callers + 1]].
	self assert: bad isEmpty description: bad asArray printString.
	self assert: callers = 12
		description: 'methods reporting _dict: ' , callers printString
%
