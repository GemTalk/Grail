! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for IRTextSourcesChunkedTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'IRTextSourcesChunkedTestCase'
  instVarNames: #( irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
IRTextSourcesChunkedTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! IRTextSourcesChunkedTestCase
!
! THE IR TEXT TWIN MUST FIT GEMSTONE'S 5M-BYTE LITERAL LIMIT.
!
! A class with IR-built methods carries, class-side, the Smalltalk text each IR
! method replaced (``___irTextSources___''), because the MI merge and three
! other consumers re-compile a method's source and an IR method's source is its
! Python.  The table was ONE accessor compiled from ONE string literal, and the
! limit is in STORAGE bytes: a single character above U+FFFF anywhere in the
! class makes the whole literal four bytes a character.  test_builtin's
! BuiltinTest measured 1,464,437 characters -> 5.86 MB, and under IR the module
! failed to import (``string literal too big'') while the text path, which
! carries no twin, scored OK 133/0/0.
!
! Tables too big for one literal are now split into chunk accessors that one
! ``___irTextSources___'' threads a table through.  What can go wrong is a LOST
! OR ALTERED entry: a consumer asking for a selector whose text fell out of the
! split gets nil and silently falls back.  So the split is checked for EQUALITY
! against the whole table, with a positive control that it actually split --
! an equality between two single accessors would pass and prove nothing.
!
! All three tests force IR: the text path builds no twin at all, so a flag-off
! run exercises none of this.
! ===============================================================================

doit
IRTextSourcesChunkedTestCase removeAllMethods.
IRTextSourcesChunkedTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: IRTextSourcesChunkedTestCase
tearDown
	SessionTemps current removeKey: #'___grailIRTextSourcesBudget___' ifAbsent: [].
	importlib ___irCodegenEnabledInvalidate___.
	#(#'ttc_ir' #'ttc_builtin_ir') do: [:n |
		(importlib @env1:modules) removeKey: n ifAbsent: [].
		self ___forgetCanonicalModule___: n asString].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil]
%

category: 'Grail-Private'
method: IRTextSourcesChunkedTestCase
___load___: aPath as: aName budget: aBudgetOrNil
	"A fresh forced-IR import.  The same module NAME every time, so two loads'
	tables can be compared entry for entry: the text twin can mention the
	module, and two names would differ for a reason that is not the split."

	(importlib @env1:modules) removeKey: aName asSymbol ifAbsent: [].
	self ___forgetCanonicalModule___: aName.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	aBudgetOrNil isNil
		ifTrue: [SessionTemps current removeKey: #'___grailIRTextSourcesBudget___' ifAbsent: []]
		ifFalse: [SessionTemps current at: #'___grailIRTextSourcesBudget___' put: aBudgetOrNil].
	importlib ___irCodegenForce___: true.
	^ importlib loadModuleFromPath: aPath name: aName
%

category: 'Grail-Private'
method: IRTextSourcesChunkedTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/ir_text_sources_chunked.py'
%

category: 'Grail-Private'
method: IRTextSourcesChunkedTestCase
___mixinOf___: aModule
	^ aModule @env1:___pyAttrLoad___: #'Mixin'
%

category: 'Grail-Private'
method: IRTextSourcesChunkedTestCase
___tableOf___: aClass
	"The table as importlib's reader gets it: the one entry point, sent to the
	class.  Copied, because the next load rebuilds the class."

	^ (aClass perform: #'___irTextSources___' env: 1) copy
%

category: 'Grail-Private'
method: IRTextSourcesChunkedTestCase
___isSplit___: aClass
	^ (aClass class whichClassIncludesSelector: #'___irTextSources_2___:'
		environmentId: 1) notNil
%

category: 'Grail-Tests - the text twin under the literal limit'
method: IRTextSourcesChunkedTestCase
testASplitTableEqualsTheWholeOne
	"Lose or alter nothing.  The same source built twice -- once whole, once
	under a budget small enough to split it -- must answer the same table."

	| whole split wholeCls splitCls |
	wholeCls := self ___mixinOf___: (self ___load___: self ___fixturePath___ as: 'ttc_ir' budget: nil).
	self deny: (self ___isSplit___: wholeCls)
		description: 'the default budget split a table this small'.
	whole := self ___tableOf___: wholeCls.
	splitCls := self ___mixinOf___: (self ___load___: self ___fixturePath___ as: 'ttc_ir' budget: 300).
	self assert: (self ___isSplit___: splitCls)
		description: 'a 300-byte budget did not split the table, so the equality '
			, 'below would compare two single accessors and prove nothing'.
	split := self ___tableOf___: splitCls.
	self assert: whole size >= 6
		description: 'the whole table holds ' , whole size printString
			, ' entries -- the fixture''s methods were not IR-built'.
	self assert: split keys asSortedCollection asArray = whole keys asSortedCollection asArray
		description: 'the split table has different selectors: '
			, split keys asSortedCollection asArray printString , ' vs '
			, whole keys asSortedCollection asArray printString.
	whole keysAndValuesDo: [:k :v |
		self assert: (split at: k) = v
			description: 'the split table altered the text source of ' , k printString]
%

category: 'Grail-Tests - the text twin under the literal limit'
method: IRTextSourcesChunkedTestCase
testEveryMergedMethodWorksFromASplitTable
	"The table's real consumer.  Merged(Base, Mixin) gets Mixin's methods by
	the MI merge re-compiling their text twins, so an entry lost in the split
	is a method missing from Merged -- including the one whose astral-plane
	character sets its chunk's storage width."

	| mod |
	mod := self ___load___: self ___fixturePath___ as: 'ttc_ir' budget: 300.
	self assert: (self ___isSplit___: (self ___mixinOf___: mod))
		description: 'the table did not split; this test would measure nothing'.
	self
		assert: (mod @env1:___pyAttrLoad___: #'SUMMARY') asString
		equals: '7 checks, 0 disagreeing [], keys match: True'
%

category: 'Grail-Tests - the text twin under the literal limit'
method: IRTextSourcesChunkedTestCase
testTheModuleThatOverflowedTheLimitImportsUnderIR
	"The defect itself, on the module that found it, at the real budget.
	BuiltinTest's twin was 5.86 MB in one literal and the import raised
	``string literal too big (exceeds 5M bytes)''."

	| mod |
	mod := self ___load___: importlib grailDir , '/src/python/stdlib/test/test_builtin.py'
		as: 'ttc_builtin_ir' budget: nil.
	self assert: (self ___isSplit___: (mod @env1:___pyAttrLoad___: #'BuiltinTest'))
		description: 'BuiltinTest''s table was not split at the real budget'
%
