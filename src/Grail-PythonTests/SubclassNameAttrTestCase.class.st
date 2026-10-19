Class {
	#name : 'SubclassNameAttrTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
SubclassNameAttrTestCase >> setUp [
	"Reload tests/python/subclass_name_attr.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'subclass_name_attr' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/subclass_name_attr.py')
		name: 'subclass_name_attr'.

]

{ #category : 'Grail-Tests - other kernel slots' }
SubclassNameAttrTestCase >> testCategoryFieldDoesNotOverwriteSubclassName [
	"``category'' is another kernel metaclass instVar.  Same fix
	covers it: a subclass keeps its own __name__ even when the
	parent declares 'category: str'."

	self assert: (testModule @env1:___pyAttrLoad___: #child_category_name)
		equals: 'ChildOfCategory'

]

{ #category : 'Grail-Tests - name annotation' }
SubclassNameAttrTestCase >> testParentClassNameUnchanged [
	"Parent declares 'name: str' as a bare annotation; its
	``__name__'' must still be 'WithNameField'."

	self assert: (testModule @env1:___pyAttrLoad___: #parent_name) equals: 'WithNameField'

]

{ #category : 'Grail-Tests - name annotation' }
SubclassNameAttrTestCase >> testSubclassNameNotOverwrittenByInheritance [
	"Subclass that doesn't redeclare 'name' must keep its own
	__name__ ('ChildOfWithName'), not inherit the parent's name
	('WithNameField') via ___inheritClassAttrs___."

	self assert: (testModule @env1:___pyAttrLoad___: #child_name) equals: 'ChildOfWithName'.
	self assert: (testModule @env1:___pyAttrLoad___: #parent_and_child_differ) equals: true

]
