Class {
	#name : 'StandInPackagesTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'installed',
		'standIns'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
StandInPackagesTestCase >> assertAll: names in: aModule [

	| results |
	results := aModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Setup' }
StandInPackagesTestCase >> setUp [

	#('installed_package_beats_stand_in' 'grail_standins') do: [:n |
		importlib @env1:modules removeKey: n asSymbol ifAbsent: []].
	installed := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/installed_package_beats_stand_in.py')
		name: 'installed_package_beats_stand_in'.
	standIns := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/grail_standins.py')
		name: 'grail_standins'

]

{ #category : 'Grail-Tests' }
StandInPackagesTestCase >> testAnInstalledPackageIsTheOneImported [

	self assertAll: #('an_installed_click_wins' 'an_installed_requests_wins'
		'and_its_submodules_come_from_it') in: installed

]

{ #category : 'Grail-Tests' }
StandInPackagesTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: ((installed @env1:___pyAttrLoad___: #RESULTS) @env1:__len__) equals: 3.
	self assert: ((standIns @env1:___pyAttrLoad___: #RESULTS) @env1:__len__) equals: 4

]

{ #category : 'Grail-Tests' }
StandInPackagesTestCase >> testTheStandInAnswersOnlyWhenNothingIsInstalled [

	self assertAll: #('grail_ships_no_click_or_requests'
		'the_stand_in_answers_when_nothing_is_installed'
		'an_installed_package_that_fails_to_import_raises'
		'flask_and_twilio_use_the_stand_ins') in: standIns

]
