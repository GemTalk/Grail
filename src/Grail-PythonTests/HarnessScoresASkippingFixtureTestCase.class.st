Class {
	#name : 'HarnessScoresASkippingFixtureTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
HarnessScoresASkippingFixtureTestCase >> testAFixtureThatRaisesSkipTestSkipsTheTestsItCovers [
	"tests/python/harness_scores_a_skipping_fixture.py: the CPython-suite
	harness scores a test whose setUpClass or setUpModule raises
	unittest.SkipTest as skipped without running it, still runs the test of a
	fixture that merely fails, and leaves the next module's tests to run."

	| fixture |
	importlib @env1:modules removeKey: #'harness_scores_a_skipping_fixture' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/harness_scores_a_skipping_fixture.py')
		name: 'harness_scores_a_skipping_fixture'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '4 checks, 0 disagreeing [], keys match: True'

]
