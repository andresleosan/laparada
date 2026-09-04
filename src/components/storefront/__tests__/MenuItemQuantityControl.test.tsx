import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MenuItemQuantityControl } from '../MenuItemQuantityControl';

describe('MenuItemQuantityControl', () => {
  it('ofrece una acción explícita para agregar un plato que aún no está en el pedido', () => {
    const onIncrease = vi.fn();
    const control = MenuItemQuantityControl({
      itemName: 'Panceroti ranchero',
      quantity: 0,
      onDecrease: vi.fn(),
      onIncrease,
    });
    const html = renderToStaticMarkup(
      <MenuItemQuantityControl
        itemName="Panceroti ranchero"
        quantity={0}
        onDecrease={vi.fn()}
        onIncrease={onIncrease}
      />
    );

    control.props.onClick();

    expect(onIncrease).toHaveBeenCalledOnce();
    expect(html).toContain('aria-label="Agregar Panceroti ranchero al pedido"');
    expect(html).toContain('Agregar');
    expect(html).not.toContain('aria-label="Reducir cantidad');
  });

  it('reemplaza agregar por controles accesibles cuando el plato ya está en el pedido', () => {
    const onDecrease = vi.fn();
    const onIncrease = vi.fn();
    const control = MenuItemQuantityControl({
      itemName: 'Panceroti ranchero',
      quantity: 2,
      onDecrease,
      onIncrease,
    });
    const html = renderToStaticMarkup(
      <MenuItemQuantityControl
        itemName="Panceroti ranchero"
        quantity={2}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
      />
    );
    const children = control.props.children as React.ReactElement[];

    children[0].props.onClick();
    children[2].props.onClick();

    expect(onDecrease).toHaveBeenCalledOnce();
    expect(onIncrease).toHaveBeenCalledOnce();
    expect(html).toContain('aria-label="Cantidad de Panceroti ranchero en el pedido"');
    expect(html).toContain('aria-label="Reducir cantidad de Panceroti ranchero"');
    expect(html).toContain('aria-label="Aumentar cantidad de Panceroti ranchero"');
    expect(html).toMatch(/>2<\/span>/);
    expect(html).not.toContain('aria-label="Agregar Panceroti ranchero al pedido"');
  });
});
