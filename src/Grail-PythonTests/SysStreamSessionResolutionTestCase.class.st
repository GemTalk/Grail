Class {
	#name : 'SysStreamSessionResolutionTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'savedStreams'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SysStreamSessionResolutionTestCase >> ___otherSys___ [
	"A SECOND sys instance, standing in for the committed one a warm-bound
	canonical module holds as its ``sys'' global."

	^ sys new

]

{ #category : 'Grail-Private' }
SysStreamSessionResolutionTestCase >> ___sessionSys___ [
	^ importlib @env1:lookupModule: 'sys'

]

{ #category : 'Grail-Setup' }
SysStreamSessionResolutionTestCase >> setUp [
	"Swap in a COPY of the session stream registry, so a redirect made by a test
	cannot leak into the rest of the suite -- a leaked sys.stderr would send
	every later write into a test's own object."

	savedStreams := SessionTemps current at: #GrailSysStreams otherwise: nil.
	savedStreams ifNotNil: [
		SessionTemps current at: #GrailSysStreams put: savedStreams copy].

]

{ #category : 'Grail-Setup' }
SysStreamSessionResolutionTestCase >> tearDown [
	SessionTemps current at: #GrailSysStreams put: savedStreams.
	savedStreams := nil.

]

{ #category : 'Grail-Tests-SysStreams' }
SysStreamSessionResolutionTestCase >> test_a_redirect_is_visible_through_another_instance [
	"THE DEFECT.  Redirecting sys.stderr in this session must reach what a
	warm-bound module writes, and that module holds a different sys object."

	| a b marker |
	a := self ___sessionSys___.
	b := self ___otherSys___.
	marker := Array with: 'redirect-marker'.
	a @env1:___pyAttrStore___: #'stderr' put: marker.
	self assert: (b @env1:___pyAttrLoad___: #'stderr') == marker
		description: 'the redirect was not visible through a second sys instance'.
	self assert: (a @env1:___pyAttrLoad___: #'stderr') == marker
		description: 'the redirect was not visible through the session sys itself'.

]

{ #category : 'Grail-Tests-SysStreams' }
SysStreamSessionResolutionTestCase >> test_a_redirect_through_the_other_instance_is_visible_here [
	"Symmetric: a warm-bound module that reassigns sys.stderr is redirecting
	the session, not just its own object."

	| a b marker |
	a := self ___sessionSys___.
	b := self ___otherSys___.
	marker := Array with: 'other-marker'.
	b @env1:___pyAttrStore___: #'stderr' put: marker.
	self assert: (a @env1:___pyAttrLoad___: #'stderr') == marker.

]

{ #category : 'Grail-Tests-SysStreams' }
SysStreamSessionResolutionTestCase >> test_a_second_instance_is_really_a_different_object [
	"Guards the other tests from passing vacuously: if these were the same
	object, every sharing assertion below would hold trivially."

	self deny: self ___sessionSys___ == self ___otherSys___.

]

{ #category : 'Grail-Tests-SysStreams' }
SysStreamSessionResolutionTestCase >> test_an_unrelated_attribute_store_still_falls_through [
	"Only the six stream names are intercepted; everything else keeps the
	inherited per-instance store."

	| a marker prev |
	a := self ___sessionSys___.
	prev := a @env1:___pyAttrLoad___: #'ps1'.
	marker := Array with: 'ps1-marker'.
	a @env1:___pyAttrStore___: #'ps1' put: marker.
	self assert: (a @env1:___pyAttrLoad___: #'ps1') == marker.
	"Asserted against the registry rather than by reading ps1 off a second
	instance: that read raises a Grail AttributeError, which an ``on: Error''
	in a test does not reliably catch, so the test would error on its own
	scaffolding rather than report the thing it is checking."
	self deny: ((sys @env1:___sessionStreams___) includesKey: #'ps1')
		description: 'a non-stream attribute leaked into session state'.
	a @env1:___pyAttrStore___: #'ps1' put: prev.

]

{ #category : 'Grail-Tests-SysStreams' }
SysStreamSessionResolutionTestCase >> test_default_streams_are_shared_across_instances [
	"The DEFAULT matters as much as an explicit redirect: a stale instance's
	own __stderr__ slot is the committing session's console stream, which in a
	netldi-forked gem writes to a sink nothing reads."

	| a b |
	a := self ___sessionSys___.
	b := self ___otherSys___.
	self assert: (a @env1:___pyAttrLoad___: #'stderr')
		== (b @env1:___pyAttrLoad___: #'stderr').
	self assert: (a @env1:___pyAttrLoad___: #'stdout')
		== (b @env1:___pyAttrLoad___: #'stdout').

]

{ #category : 'Grail-Tests-SysStreams' }
SysStreamSessionResolutionTestCase >> test_restoring_the_previous_stream_works [
	"The idiom the whole issue is about: capture, redirect, restore."

	| a prev marker |
	a := self ___sessionSys___.
	prev := a @env1:___pyAttrLoad___: #'stderr'.
	marker := Array with: 'tmp'.
	a @env1:___pyAttrStore___: #'stderr' put: marker.
	self assert: (a @env1:___pyAttrLoad___: #'stderr') == marker.
	a @env1:___pyAttrStore___: #'stderr' put: prev.
	self assert: (a @env1:___pyAttrLoad___: #'stderr') == prev.

]

{ #category : 'Grail-Tests-SysStreams' }
SysStreamSessionResolutionTestCase >> test_stderr_is_stderr_dunder_when_unredirected [
	"``sys.stderr is sys.__stderr__'' held before this change and must still
	hold -- which is why the dunders are session-resolved too rather than left
	per-instance."

	| a |
	a := self ___sessionSys___.
	self assert: (a @env1:___pyAttrLoad___: #'stderr')
		== (a @env1:___pyAttrLoad___: #'__stderr__').
	self assert: (a @env1:___pyAttrLoad___: #'stdout')
		== (a @env1:___pyAttrLoad___: #'__stdout__').

]
