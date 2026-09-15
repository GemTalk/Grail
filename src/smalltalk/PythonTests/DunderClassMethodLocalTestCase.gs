! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for DunderClassMethodLocalTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'DunderClassMethodLocalTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
DunderClassMethodLocalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! DunderClassMethodLocalTestCase
!
! ``__class__'' INSIDE A METHOD OF A METHOD-LOCAL CLASS, THROUGH THE IR PATH.
!
! ``cm:NameAst:__class__-methodLocalClass'' (12).  CPython gives every method
! that mentions ``__class__'' an implicit closure cell holding the class.  For a
! module-scope class Grail reads it back as a module attribute (cut 55); for a
! class defined inside a FUNCTION there is no module attribute to read, so the
! class comes from the INJECTED cell instead -- one send:
!
!     (self @env1:___dunderClassCell___: #'___cell_<Cls>___')
!
! printClassObjectOn:cellSelector:'s other branch, and the reason it is
! ___dunderClassCell___ rather than the plain ___classCell___ is that
! ``__class__'' wants what the cell HOLDS -- a read that still answers the class
! when a metaclass has replaced the name binding with a non-class.
!
! THE SIDE EFFECTS ARE PART OF THE EMIT, not decoration.  addCapturedClassName:
! is what makes ClassDefAst emit the cell store at definition time; without it
! the class carries no ___cell_<Cls>___ and the read finds nothing.
! classNeedsClassCell: and ___recordClassCellMethod___ are CPython's own
! condition for injecting ``__classcell__'' -- per method, so __closure__ can
! answer per method rather than per class.
!
! WHAT THE MODULE-SCOPE ARM DOES AND THIS ONE MUST NOT.  That arm wraps its read
! in ___grailClassCellValue___ when the cell is rebindable.  This read already
! goes THROUGH the cell, which is the thing a rebind changes, so wrapping it
! would read the cell twice.
!
! A NOTE ON READING THE TEXT.  ``importlib smalltalkForPath:'' renders this case
! as a bare ``__class__'' identifier, which looks like the emit does nothing.
! It is the module-level program, not what the class's method is compiled from:
! the INSTALLED method's sourceString is the ___dunderClassCell___ send.  Read
! the compiled method, not the module dump, when checking this shape.
! ===============================================================================

doit
DunderClassMethodLocalTestCase removeAllMethods.
DunderClassMethodLocalTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: DunderClassMethodLocalTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'dunder_mlc_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'dunder_mlc_census' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'dunder_mlc_ir'.
	self ___forgetCanonicalModule___: 'dunder_mlc_census'.
	irModule := nil
%

category: 'Grail-Private'
method: DunderClassMethodLocalTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/dunder_class_method_local.py'
%

category: 'Grail-Private'
method: DunderClassMethodLocalTestCase
___keys___
	"Named rather than read from the dict so a fixture key that stops being
	produced fails here instead of silently dropping out of the comparison."

	^ #('it_is_the_defining_class' 'defining_class_not_receiver_class'
	    'each_class_gets_its_own' 'separate_calls_make_separate_classes'
	    'resolves_from_a_nested_function' 'resolves_inside_a_comprehension'
	    'works_alongside_zero_arg_super' 'the_class_name_reads_back')
%

category: 'Grail-Private'
method: DunderClassMethodLocalTestCase
___irModule___
	"The fixture with the seam FORCED ON, under a second module name.

	Forced rather than inherited: what this pins is an ELIGIBILITY widening, so
	a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'dunder_mlc_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'dunder_mlc_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___
		name: 'dunder_mlc_ir'.
	^ irModule
%

category: 'Grail-Private'
method: DunderClassMethodLocalTestCase
___disagreeingKeys___
	| mod results expected bad |
	mod := self ___irModule___.
	results := mod @env1:___pyAttrLoad___: #'r'.
	expected := mod @env1:___pyAttrLoad___: #'EXPECTED'.
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := (results @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		want := (expected @env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	^ bad
%

category: 'Grail-Tests - __class__ in a method-local class'
method: DunderClassMethodLocalTestCase
testEveryDunderClassShapeAgreesWithCPythonUnderIR
	"All eight shapes with the seam forced on.

	``defining_class_not_receiver_class'' is the one a wrong recovery passes
	while being wrong: reading ``type(self)'' instead of the cell gives the
	same answer for every instance of the defining class and only diverges on a
	SUBCLASS instance, which is precisely why CPython uses a cell.
	``separate_calls_make_separate_classes'' catches the opposite error, a
	binding shared across calls of the enclosing function."

	| bad |
	bad := self ___disagreeingKeys___.
	self assert: bad isEmpty
		description: '__class__ shapes disagreeing with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - __class__ in a method-local class'
method: DunderClassMethodLocalTestCase
testTheIRArmDidNotFallBack
	"Correct answers prove nothing if the seam fell back to text."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'
%

category: 'Grail-Private'
method: DunderClassMethodLocalTestCase
___censusCountsForFixture___
	"Load the fixture under the ELIGIBILITY CENSUS and answer its counts."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dunder_mlc_census' ifAbsent: [].
	self ___forgetCanonicalModule___: 'dunder_mlc_census'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irCensusReset___.
	importlib ___irCensusOn: true.
	[importlib loadModuleFromPath: self ___fixturePath___ name: 'dunder_mlc_census']
		ensure: [importlib ___irCensusOn: false].
	^ importlib ___irCensus___ at: #counts
%

category: 'Grail-Tests - __class__ in a method-local class'
method: DunderClassMethodLocalTestCase
testDunderClassInAMethodLocalClassIsNowEligible
	"The assertion that fails if the cut is reverted, and the only instrument
	that can see it.

	MEASURED BOTH WAYS on this fixture.  Reverted, it censuses 9
	`cm:NameAst:__class__-methodLocalClass' against 2 `cm:eligible' and compiles
	11 of the 20 -- and the behavioural test above STILL PASSES, because the
	text twin answers all eight correctly."

	| counts |
	importlib ___irCodegenEnabled___ ifFalse: [^ self].
	counts := self ___censusCountsForFixture___.
	self assert: (counts at: #'cm:NameAst:__class__-methodLocalClass' ifAbsent: [0]) = 0
		description: '__class__ in a method-local class still refuses: '
			, counts printString.
	self assert: (counts at: #'cm:eligible' ifAbsent: [0]) >= 11
		description: 'fewer class methods eligible than the cut measured (11): '
			, counts printString
%
