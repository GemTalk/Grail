Extension { #name : 'PyFrameLocals' }

{ #category : 'Grail-Live View' }
PyFrameLocals >> ___snapshot___ [
	"A plain PyDict holding what this view sees right now.

	Grail's dict iterators take the entry list at creation and then re-check the
	dict's SIZE on every step, raising CPython's ``dictionary changed size during
	iteration'' when it moved.  A live view moves by design -- the second step of
	a walk runs at a different stack depth from the first -- so iterating one
	directly turned an ordinary read into a RuntimeError
	(``StackSummary.extract(..., capture_locals=True)'', test_traceback's
	test_format_locals).

	Iterating a copy is not a workaround for that but the same thing CPython
	does: FrameLocalsProxy's keys(), values() and items() each answer a LIST, and
	iter(proxy) walks a snapshot of the keys.  A view is live between reads, not
	during one."

	| out |
	self @env0:___refresh___.
	out := (Python @env0:at: #'PyDict') @env0:new.
	self @env0:keysAndValuesDo: [:k :v | out @env0:at: k put: v].
	^ out

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> __iter__ [
	^ self ___snapshot___ __iter__

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> items [
	^ self ___snapshot___ items

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> keys [
	^ self ___snapshot___ keys

]

{ #category : 'Grail-Live View' }
PyFrameLocals >> values [
	^ self ___snapshot___ values

]
