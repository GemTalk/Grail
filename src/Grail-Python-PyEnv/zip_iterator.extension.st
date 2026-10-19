Extension { #name : 'zip_iterator' }

{ #category : 'Grail-Instance Creation' }
zip_iterator class >> ___on: anArrayOfIterators [
	^ self ___on: anArrayOfIterators strict: false

]

{ #category : 'Grail-Instance Creation' }
zip_iterator class >> ___on: anArrayOfIterators strict: aBoolean [
	| instance |
	instance := self ___new___.
	instance ___sources: anArrayOfIterators strict: aBoolean.
	^ instance

]

{ #category : 'Grail-Private' }
zip_iterator >> ___sources: anArrayOfIterators strict: aBoolean [
	sources := anArrayOfIterators.
	strict := aBoolean

]

{ #category : 'Grail-Iterator Protocol' }
zip_iterator >> __next__ [
	"One item from each source, as a tuple.  StopIteration from ANY
	source propagates and ends the zip (shortest-input semantics).

	Under ``strict=True'' the shortest input is an ERROR instead, so the
	StopIteration has to be caught to find out WHICH source ran out --
	see iterator >> ___strictExhausted___:sources:name:.  The plain path
	is left untouched: it must stay a bare propagate so an infinite
	source is never pulled a second time."

	| items |
	sources @env0:isEmpty ifTrue: [StopIteration ___signal___: nil].
	items := Array @env0:new: sources @env0:size.
	1 @env0:to: sources @env0:size do: [:i |
		strict @env0:== true
			ifTrue: [ | item stopped |
				stopped := false.
				item := [(sources @env0:at: i) __next__]
					@env0:on: StopIteration do: [:ex |
						stopped := true.
						ex @env0:return: nil].
				stopped ifTrue: [
					^ self ___strictExhausted___: i sources: sources name: 'zip'].
				items @env0:at: i put: item]
			ifFalse: [items @env0:at: i put: (sources @env0:at: i) __next__]].
	^ tuple @env0:withAll: items

]

{ #category : 'Grail-Pickle Support' }
zip_iterator >> __reduce__ [
	"CPython's zip_reduce: ``(type(self), tuple_of_iterators)'', plus a
	trailing ``True'' state when strict= is set.  Measured on 3.14.6:

	    zip([1],[2]).__reduce__()              -> (zip, (<it>, <it>))
	    zip([1],[2], strict=True).__reduce__()  -> (zip, (<it>, <it>), True)

	Unlike map there is no leading function, so the argument tuple is the
	sources themselves.  See map_iterator>>__reduce__ for why strict needs the
	state slot rather than an argument."

	strict @env0:== true ifTrue: [
		^ tuple @env0:withAll: {
			self ___builtinNamed___: #'zip'.
			tuple @env0:withAll: sources.
			true }].
	^ tuple @env0:withAll: {
		self ___builtinNamed___: #'zip'.
		tuple @env0:withAll: sources }

]

{ #category : 'Grail-Pickle Support' }
zip_iterator >> __setstate__: aState [
	"Restore the strict flag; see map_iterator>>__setstate__:."

	aState @env0:== true ifTrue: [strict := true].
	^ None

]
