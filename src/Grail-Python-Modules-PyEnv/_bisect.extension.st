Extension { #name : '_bisect' }

{ #category : 'Grail-Built-in Functions' }
_bisect >> bisect_left: a _: x [
	"Python _bisect.bisect_left(a, x) — fast path. Returns
	the leftmost insertion point for x in sorted list a."

	^ self @env0:class @env0:callBisect: 'bisect_left' list: a value: x

]

{ #category : 'Grail-Built-in Functions' }
_bisect >> bisect_right: a _: x [
	"Python _bisect.bisect_right(a, x) — fast path. Returns
	the rightmost insertion point for x in sorted list a."

	^ self @env0:class @env0:callBisect: 'bisect_right' list: a value: x

]

{ #category : 'Grail-Initialization' }
_bisect >> initialize [
	"No-op. The `module>>instance` class method still calls
	`initialize` on the newly-created instance, so this stub keeps
	that contract."

]

{ #category : 'Grail-Built-in Functions' }
_bisect >> insort_left: a _: x [
	"Python _bisect.insort_left(a, x) — fast path. Inserts
	x into sorted list a at the leftmost insertion point. Modifies
	the list in place; returns None."

	self @env0:class @env0:callInsort: 'insort_left' list: a value: x.
	^ None

]

{ #category : 'Grail-Built-in Functions' }
_bisect >> insort_right: a _: x [
	"Python _bisect.insort_right(a, x) — fast path. Inserts
	x into sorted list a at the rightmost insertion point. Modifies
	the list in place; returns None."

	self @env0:class @env0:callInsort: 'insort_right' list: a value: x.
	^ None

]
