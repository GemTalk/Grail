## Progress — cut 27 (assert, slices, del)

* **assert** — `(test) ___isTruthy___ ifFalse: [AssertionError signal]` (env 0)
  or, with a message, `... ifFalse: [AssertionError ___signal___: msg]` (env
  1).  The text spells the two sends as `perform: #signal env: 0` / `perform:
  #'___signal___:' env: 1 withArguments:` -- text-syntax spellings the IR sends
  directly.  The builder grew `unless:then:` (inlined ifFalse:, controlOp
  COMPAR__IF_FALSE = 2).
* **slice loads** `xs[i:j:k]` → `(xs) __getitem__: (slice @env0:___newStart: lo
  stop: hi step: st)`, nil for an omitted bound -- the SequenceableCollection
  fast path's spelling, special-cased in SubscriptAst exactly as the text does.
* **slice objects** everywhere else (store / del subscripts, values) →
  `slice @env1:__new__: lo _: hi _: st` with None for omitted bounds: SliceAst
  is now an emittable value, which makes `xs[i:j] = v` eligible through
  AssignAst's existing subscript-store path with no change there.
* **del** `x[k]` → `(x) __delitem__: (k)`; `del o.a` → `(o) @env1:__delattr__:
  'a'` (a Smalltalk String: user overrides compare `name == 'a'` str-vs-str).
  `del name` stays on text -- it unbinds a local and a later read would need
  the unbound guard the IR path does not emit.

Fixture: check_positive / check_with_msg (ASSERT_BARE == "", ASSERT_MSG),
middle / evens / prefix / tail_from (four slice shapes), splice (slice store),
drop_key, drop_attr; compiled 82 -> 91.

Cut 27 flag-on sweep: only the four known-family residuals (two PEP 657 column
classes, two inherent); neither cold-shard order ERROR from cut 26 recurred.
