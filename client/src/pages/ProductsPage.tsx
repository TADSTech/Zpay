import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

interface Product {
  id: string;
  name: string;
  price: number;
  variants: string[];
  stockQuantity: number;
}

function formatCurrency(amount: number): string {
  return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('10');
  const [newVariants, setNewVariants] = useState('');
  const [notAvailableMessage, setNotAvailableMessage] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [adding, setAdding] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ title: string; message: string } | null>(null);
  
  const isMock = user?.isMock === true;

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<{ success: boolean; products: Product[]; settings: any }>('/api/products');
      if (data.success) {
        setProducts(data.products || []);
        if (data.settings?.notAvailableMessage) {
          setNotAvailableMessage(data.settings.notAvailableMessage);
        } else {
          setNotAvailableMessage("Item is not available.");
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice || adding) return;

    if (isMock) {
      setModalInfo({ title: 'Mock Account', message: 'Adding products is disabled for the demo mock account.' });
      return;
    }

    setAdding(true);
    const variantsList = newVariants.split(',').map(s => s.trim()).filter(s => s);
    
    try {
      const data = await apiPost<{ success: boolean; product?: Product; error?: string }>('/api/products', {
        name: newName,
        price: Number(newPrice),
        stockQuantity: Number(newStock) || 0,
        variants: variantsList
      });

      if (data.success && data.product) {
        setProducts([data.product, ...products]);
        setNewName('');
        setNewPrice('');
        setNewStock('10');
        setNewVariants('');
      } else {
        setModalInfo({ title: 'Error', message: data.error || 'Failed to add product' });
      }
    } catch (err: any) {
      setModalInfo({ title: 'Error', message: err.message || 'Failed to communicate with server' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="view-panel" id="panel-products">
      <div className="developer-grid">
        <div className="developer-col">
          <section className="panel">
            <div className="panel-header">
              <h3>Product Catalog</h3>
              <p>These products are synced with the ZPay AI for conversational checkout parsing.</p>
            </div>
            
            <div className="table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Variants</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={3} className="empty-table">Loading...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={3} className="empty-table">No products in your catalog.</td></tr>
                  ) : (
                    products.map(p => (
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td>{formatCurrency(p.price)}</td>
                        <td>{p.stockQuantity ?? 0}</td>
                        <td className="items-cell" title={p.variants.join(', ')}>
                          {p.variants.length > 0 ? (
                            p.variants.map((v, i) => (
                              <span key={i} className="badge-type" style={{ marginRight: '4px' }}>{v}</span>
                            ))
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header">
            <h3>Add New Product</h3>
            <p>{isMock ? 'Disabled in demo mode.' : 'Expand your AI catalog.'}</p>
          </div>
          <form className="credentials-list" onSubmit={handleAddProduct}>
            <div className="cred-item">
              <label>Product Name</label>
              <input type="text" placeholder="e.g. Leather Jacket" value={newName} onChange={e => setNewName(e.target.value)} required disabled={isMock} />
            </div>
            <div className="cred-item">
              <label>Price (₦)</label>
              <input type="number" placeholder="55000" value={newPrice} onChange={e => setNewPrice(e.target.value)} required disabled={isMock} />
            </div>
            <div className="cred-item">
              <label>Stock Quantity</label>
              <input type="number" placeholder="10" value={newStock} onChange={e => setNewStock(e.target.value)} required disabled={isMock} />
            </div>
            <div className="cred-item">
              <label>Variants (comma separated)</label>
              <input type="text" placeholder="e.g. Red, Blue, Large, Small" value={newVariants} onChange={e => setNewVariants(e.target.value)} disabled={isMock} />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={isMock || adding}>
              {adding ? 'Adding...' : 'Add to Catalog'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>AI Out-of-Stock Response</h3>
            <p>Customize what the ZPay AI says when a customer requests a product not in the catalog.</p>
          </div>
          <div className="credentials-list">
            <div className="cred-item">
              <label>Not Available Message</label>
              <textarea 
                className="select-field"
                style={{ resize: 'vertical', minHeight: '80px', padding: '0.7rem' }}
                placeholder="e.g. I'm sorry, but we don't have that item in stock." 
                value={notAvailableMessage} 
                onChange={e => setNotAvailableMessage(e.target.value)} 
                disabled={isMock} 
              />
            </div>
            <button 
              className="btn btn-secondary btn-full" 
              disabled={isMock || savingSettings}
              onClick={async () => {
                setSavingSettings(true);
                try {
                  const data = await apiPost<{ success: boolean; error?: string }>('/api/products', {
                    action: 'updateSettings',
                    notAvailableMessage
                  });
                  if (data.success) {
                    setModalInfo({ title: 'Success', message: 'AI Out-of-Stock response updated.' });
                  } else {
                    setModalInfo({ title: 'Error', message: data.error || 'Failed to update settings.' });
                  }
                } catch(e: any) {
                  setModalInfo({ title: 'Error', message: e.message || 'Error communicating with server.' });
                } finally {
                  setSavingSettings(false);
                }
              }}
            >
              {savingSettings ? 'Saving...' : 'Save Message'}
            </button>
          </div>
        </section>
      </div>

      <Modal open={!!modalInfo} title={modalInfo?.title || ''} onClose={() => setModalInfo(null)}>
        <p>{modalInfo?.message}</p>
      </Modal>
    </div>
  );
}
