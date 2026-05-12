from copy import copy
from sys import version_info


def apply_runtime_patches():
    """Apply safe runtime compatibility patches for the active Python version."""
    if version_info < (3, 14):
        return

    # Django 4.2's BaseContext.__copy__ uses copy(super()), which fails on
    # Python 3.14 when rendering admin templates.
    from django.template.context import BaseContext

    def _base_context_copy(self):
        duplicate = object.__new__(self.__class__)
        duplicate.__dict__.update(self.__dict__)
        duplicate.dicts = self.dicts[:]
        return duplicate

    BaseContext.__copy__ = _base_context_copy
