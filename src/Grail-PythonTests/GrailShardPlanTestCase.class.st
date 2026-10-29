"
GrailShardPlan: how the SUnit gate splits the suite into shards.

The test that matters is #testEveryTestRunsExactlyOnce: on the REAL suite and
the committed timings file, at the worker counts the gate uses, the shards'
union is the whole suite and no test is on two shards.  The rest pin the
assignment rule on small synthetic inputs.  A plan only reads each leaf's
class name, so the synthetic leaves are plain collections.
"
Class {
	#name : 'GrailShardPlanTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-helpers' }
GrailShardPlanTestCase >> leaves: aCollectionOfAssociations [
	"Synthetic leaves: for each prototype -> n, n instances of its class."

	| leaves |
	leaves := OrderedCollection new.
	aCollectionOfAssociations do: [:each |
		each value timesRepeat: [leaves add: each key copy]].
	^ leaves

]

{ #category : 'Grail-helpers' }
GrailShardPlanTestCase >> nameOf: anObject [

	^ anObject class name asString

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testDigestIsDeterministic [

	| leaves timings a b |
	leaves := self leaves: {Set new -> 3. Bag new -> 2. Array new -> 4}.
	timings := Dictionary new.
	timings at: (self nameOf: Set new) put: 70.
	a := GrailShardPlan workers: 2 leaves: leaves timings: timings reserveMs: 0.
	b := GrailShardPlan workers: 2 leaves: leaves copy timings: timings copy reserveMs: 0.
	self assert: a digest = b digest.
	#(0 1) do: [:i | self assert: (a classesOn: i) asArray = (b classesOn: i) asArray]

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testEveryTestRunsExactlyOnce [
	"The coverage invariant, on the real suite: at each worker count, every
	class is on exactly one shard in range, and the shards' test counts add up
	to the whole suite."

	| leaves timings classes |
	leaves := GrailShardPlan leavesOf: PythonTestCase suite.
	timings := GrailShardPlan readTimings: GrailShardPlan defaultTimingsPath.
	classes := (leaves collect: [:each | self nameOf: each]) asSet.
	#(1 2 8 16) do: [:n | | plan seen total |
		plan := GrailShardPlan workers: n leaves: leaves timings: timings reserveMs: 200000.
		self assert: plan suiteSize = leaves size.
		seen := Set new.
		total := 0.
		0 to: n - 1 do: [:i |
			(plan classesOn: i) do: [:each |
				self deny: (seen includes: each).
				seen add: each.
				self assert: (plan shardOf: each) = i].
			total := total + (plan testCountOn: i)].
		self assert: seen = classes.
		self assert: total = leaves size.
		leaves do: [:each | | s |
			s := plan shardOf: (self nameOf: each).
			self assert: (s between: 0 and: n - 1)]]

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testLongestFirstToLeastLoaded [
	"100 -> 0, 60 -> 1, 50 -> 1 (60 < 100), 40 -> 0 (100 < 110)."

	| leaves timings plan |
	leaves := self leaves: {Set new -> 1. Bag new -> 1. Array new -> 1. OrderedCollection new -> 1}.
	timings := Dictionary new.
	timings at: (self nameOf: Set new) put: 100.
	timings at: (self nameOf: Bag new) put: 60.
	timings at: (self nameOf: Array new) put: 50.
	timings at: (self nameOf: OrderedCollection new) put: 40.
	plan := GrailShardPlan workers: 2 leaves: leaves timings: timings reserveMs: 0.
	self assert: plan isTimed.
	self assert: (plan shardOf: (self nameOf: Set new)) = 0.
	self assert: (plan shardOf: (self nameOf: Bag new)) = 1.
	self assert: (plan shardOf: (self nameOf: Array new)) = 1.
	self assert: (plan shardOf: (self nameOf: OrderedCollection new)) = 0.
	self assert: (plan plannedMsOn: 0) = 140.
	self assert: (plan plannedMsOn: 1) = 110

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testMissingTimingsBalanceCounts [

	| plan |
	self assert: (GrailShardPlan readTimings: nil) isEmpty.
	self assert: (GrailShardPlan readTimings: '/nonexistent/grail/shard_timings.txt') isEmpty.
	plan := GrailShardPlan
		workers: 2
		leaves: (self leaves: {Set new -> 5. Bag new -> 3. Array new -> 2})
		timings: Dictionary new
		reserveMs: 99999.
	self deny: plan isTimed.
	"5 | 3 + 2, and the reserve is ignored when nothing is timed."
	self assert: (plan testCountOn: 0) = 5.
	self assert: (plan testCountOn: 1) = 5

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testReserveLoadsShardZero [

	| timings plan |
	timings := Dictionary new.
	timings at: (self nameOf: Set new) put: 100.
	timings at: (self nameOf: Bag new) put: 100.
	plan := GrailShardPlan
		workers: 2
		leaves: (self leaves: {Set new -> 1. Bag new -> 1})
		timings: timings
		reserveMs: 150.
	self assert: (plan classesOn: 0) isEmpty.
	self assert: (plan plannedMsOn: 0) = 150.
	self assert: (plan plannedMsOn: 1) = 200

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testSuiteOrderWithinAShard [

	| leaves plan |
	leaves := self leaves: {Set new -> 1. Bag new -> 1. Array new -> 1}.
	plan := GrailShardPlan workers: 1 leaves: leaves timings: Dictionary new reserveMs: 0.
	self assert: (plan classesOn: 0) asArray
		= (leaves collect: [:each | self nameOf: each]) asArray

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testUnknownClassCostsMeanPerTest [
	"Set is timed at 1000 ms over 2 tests, so Bag, untimed with 4 tests, is
	planned at 2000 ms and placed first."

	| timings plan |
	timings := Dictionary new.
	timings at: (self nameOf: Set new) put: 1000.
	plan := GrailShardPlan
		workers: 2
		leaves: (self leaves: {Set new -> 2. Bag new -> 4})
		timings: timings
		reserveMs: 0.
	self assert: (plan shardOf: (self nameOf: Bag new)) = 0.
	self assert: (plan plannedMsOn: 0) = 2000.
	self assert: (plan shardOf: (self nameOf: Set new)) = 1

]

{ #category : 'tests' }
GrailShardPlanTestCase >> testUntestedClassFallsBackToCharSum [
	"A class with no leaves (every test skipped) still has one owner, for its
	skip report."

	| plan |
	plan := GrailShardPlan workers: 4 leaves: #() timings: Dictionary new reserveMs: 0.
	self assert: (plan shardOf: 'NoSuchTestCase')
		= (GrailShardPlan charSumShardOf: 'NoSuchTestCase' workers: 4)

]
