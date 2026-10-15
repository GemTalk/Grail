! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for StandInPackagesTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'StandInPackagesTestCase'
  instVarNames: #( installed standIns)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StandInPackagesTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StandInPackagesTestCase - Grail's click and requests stand-ins never shadow
! ===============================================================================
! Grail's stand-ins for click and requests are _grail_click and
! _grail_requests.  Named click and requests in the ported stdlib, they beat
! sys.path, so an installed real package was never imported, and once Flask
! was deployed a real one was refused outright as a different module under a
! deployed name.  Vendored Flask and twilio reach them through
! _grail_standins.installed_or_stand_in(), which falls back only when the
! package is not installed.
!   tests/python/installed_package_beats_stand_in.py  3 checks, CPython's answers
!   tests/python/grail_standins.py                    4 checks, Grail-only
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StandInPackagesTestCase removeAllMethods.
StandInPackagesTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: StandInPackagesTestCase
setUp

	#('installed_package_beats_stand_in' 'grail_standins') do: [:n |
		importlib @env1:modules removeKey: n asSymbol ifAbsent: []].
	installed := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/installed_package_beats_stand_in.py')
		name: 'installed_package_beats_stand_in'.
	standIns := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/grail_standins.py')
		name: 'grail_standins'
%

category: 'Grail-Helpers'
method: StandInPackagesTestCase
assertAll: names in: aModule

	| results |
	results := aModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: StandInPackagesTestCase
testAnInstalledPackageIsTheOneImported

	self assertAll: #('an_installed_click_wins' 'an_installed_requests_wins'
		'and_its_submodules_come_from_it') in: installed
%

category: 'Grail-Tests'
method: StandInPackagesTestCase
testTheStandInAnswersOnlyWhenNothingIsInstalled

	self assertAll: #('grail_ships_no_click_or_requests'
		'the_stand_in_answers_when_nothing_is_installed'
		'an_installed_package_that_fails_to_import_raises'
		'flask_and_twilio_use_the_stand_ins') in: standIns
%

category: 'Grail-Tests'
method: StandInPackagesTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: ((installed @env1:___pyAttrLoad___: #RESULTS) @env1:__len__) equals: 3.
	self assert: ((standIns @env1:___pyAttrLoad___: #RESULTS) @env1:__len__) equals: 4
%
