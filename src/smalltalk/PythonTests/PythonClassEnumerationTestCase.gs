! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PythonClassEnumerationTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PythonClassEnumerationTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
PythonClassEnumerationTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PythonClassEnumerationTestCase - the public enumeration of Python classes
! (issue #885):
!     importlib class >> pythonClasses
!     importlib class >> pythonClassCensus
!     importlib class >> pythonDirectSubclassesOf:
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PythonClassEnumerationTestCase removeAllMethods.
PythonClassEnumerationTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-helpers'
method: PythonClassEnumerationTestCase
enumeratedClassNamed: aString
	"The enumerated class with this Python name, or nil.  Matching by NAME
	rather than by the value eval: answers keeps the assertions independent
	of what ModuleAst>>evaluateWithScope: chooses to return."

	^ importlib pythonClasses
		detect: [:c | c name asString = aString]
		ifNone: [nil]
%

category: 'Grail-Tests-ClassEnumeration'
method: PythonClassEnumerationTestCase
test_enumerates_a_module_scope_class
	self eval: 'class GrailEnumProbeTop:
    pass
'.
	self assert: (self enumeratedClassNamed: 'GrailEnumProbeTop') notNil.
%

category: 'Grail-Tests-ClassEnumeration'
method: PythonClassEnumerationTestCase
test_enumerates_a_nested_class
	"The differentiator.  GrailCanonicalClasses records only what a
	MODULE-SCOPE class statement bound, so a nested class is absent from it by
	construction; ___subclassRegistry___ is written at CREATION, so it is not."

	self eval: 'class GrailEnumProbeOuter:
    class GrailEnumProbeInner:
        pass
'.
	self assert: (self enumeratedClassNamed: 'GrailEnumProbeOuter') notNil.
	self assert: (self enumeratedClassNamed: 'GrailEnumProbeInner') notNil.
%

category: 'Grail-Tests-ClassEnumeration'
method: PythonClassEnumerationTestCase
test_enumerates_a_function_local_class
	"Same reason: creation-time registration does not care about scope."

	self eval: 'def grail_enum_probe_factory():
    class GrailEnumProbeLocal:
        pass
    return GrailEnumProbeLocal
grail_enum_probe_factory()
'.
	self assert: (self enumeratedClassNamed: 'GrailEnumProbeLocal') notNil.
%

category: 'Grail-Tests-ClassEnumeration'
method: PythonClassEnumerationTestCase
test_enumerates_a_multiple_inheritance_class_and_its_secondary_base
	"An MI class is chained under its PRIMARY base only, so the secondary base
	is reachable only through ___miRegistry___."

	self eval: 'class GrailEnumProbeMiA:
    pass
class GrailEnumProbeMiB:
    pass
class GrailEnumProbeMiC(GrailEnumProbeMiA, GrailEnumProbeMiB):
    pass
'.
	self assert: (self enumeratedClassNamed: 'GrailEnumProbeMiC') notNil.
	self assert: (self enumeratedClassNamed: 'GrailEnumProbeMiA') notNil.
	self assert: (self enumeratedClassNamed: 'GrailEnumProbeMiB') notNil.
%

category: 'Grail-Tests-ClassEnumeration'
method: PythonClassEnumerationTestCase
test_enumeration_answers_an_identity_set_without_nils
	| all |
	all := importlib pythonClasses.
	self assert: (all isKindOf: IdentitySet).
	self assert: all size > 0.
	self deny: (all includes: nil).
%

category: 'Grail-Tests-ClassEnumeration'
method: PythonClassEnumerationTestCase
test_census_total_agrees_with_the_enumeration
	| census |
	self eval: 'class GrailEnumProbeCensus:
    pass
'.
	census := importlib pythonClassCensus.
	self assert: (census at: #total) equals: importlib pythonClasses size.
	self assert: (census at: #total) > 0.
%

category: 'Grail-Tests-ClassEnumeration'
method: PythonClassEnumerationTestCase
test_census_reports_every_source
	"The point of the census is an honest coverage trailer, so each source has
	to be reportable on its own -- including whether the committed registry is
	there at all, which is the difference between ``no committed classes'' and
	``./install.sh reset it''."

	| census |
	census := importlib pythonClassCensus.
	self assert: (census at: #fromSubclassRegistry) > 0.
	self assert: (census at: #fromMiRegistry) notNil.
	self assert: (census at: #fromCanonicalClasses) notNil.
	self assert: ((census at: #canonicalRegistryPresent) == true
		or: [(census at: #canonicalRegistryPresent) == false]).
%

category: 'Grail-Tests-ClassEnumeration'
method: PythonClassEnumerationTestCase
test_census_sources_do_not_exceed_the_total
	"They OVERLAP and must not be summed, but no single source can name more
	classes than the closure reaches."

	| census total |
	census := importlib pythonClassCensus.
	total := census at: #total.
	self assert: (census at: #fromSubclassRegistry) <= total.
	self assert: (census at: #fromMiRegistry) <= total.
	self assert: (census at: #fromCanonicalClasses) <= total.
%

category: 'Grail-Tests-ClassEnumeration'
method: PythonClassEnumerationTestCase
test_direct_subclasses_of_a_session_class
	"GemStone's own Behavior>>subclasses answers EMPTY for these -- the classes
	are anonymous -- so this is the registry's work, not ClassOrganizer's."

	| base subs |
	self eval: 'class GrailEnumProbeBase:
    pass
class GrailEnumProbeDerived(GrailEnumProbeBase):
    pass
'.
	base := self enumeratedClassNamed: 'GrailEnumProbeBase'.
	self assert: base notNil.
	subs := importlib pythonDirectSubclassesOf: base.
	self assert: (subs detect: [:c | c name asString = 'GrailEnumProbeDerived']
		ifNone: [nil]) notNil.
%
