# Grail requests shim — hooks (twilio passes hooks.default_hooks()
# through Request and relies on response hooks being dispatched).

HOOKS = ['response']


def default_hooks():
    return {'response': []}


def dispatch_hook(key, hooks, hook_data, **kwargs):
    """Run the hooks registered under key over hook_data."""
    if not hooks:
        return hook_data
    registered = hooks.get(key)
    if registered is None:
        return hook_data
    if callable(registered):
        registered = [registered]
    for hook in registered:
        result = hook(hook_data, **kwargs)
        if result is not None:
            hook_data = result
    return hook_data
