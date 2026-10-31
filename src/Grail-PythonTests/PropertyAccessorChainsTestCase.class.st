Class {
	#name : 'PropertyAccessorChainsTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
PropertyAccessorChainsTestCase >> testEachAccessorDecoratorBuildsTheNextProperty [
	"tests/python/property_accessor_chains.py: @x.getter, @x.setter and
	@x.deleter over an assigned property keep every accessor and the doc, a
	subclass's @Base.x.deleter and @Base.x.deleter-then-@x.setter are the ones
	``del'' and assignment run, a deleter with a default is found, and an
	@x.setter over ``x = property(get_x)'' sets.  Each check agrees with
	CPython 3.14."

	| fixture |
	importlib @env1:modules removeKey: #'property_accessor_chains' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/property_accessor_chains.py')
		name: 'property_accessor_chains'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '5 checks, 0 disagreeing [], keys match: True'

]
