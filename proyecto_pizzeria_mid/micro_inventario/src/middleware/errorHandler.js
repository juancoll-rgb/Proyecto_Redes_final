function errorHandler(err, req, res, next) {
    if (err.statusCode >= 500) {
        console.error('Error crítico:', err);
    }

    if (err.code) {
        switch (err.code) {
            case 'ER_DUP_ENTRY':
                return res.status(409).json({
                    success: false,
                    message: 'Ya existe un registro con esos datos',
                    error: 'DUPLICATE_ENTRY'
                });
            
            case 'ER_NO_REFERENCED_ROW_2':
                return res.status(400).json({
                    success: false,
                    message: 'Referencia inválida a un registro inexistente',
                    error: 'INVALID_REFERENCE'
                });
            
            case 'ER_ROW_IS_REFERENCED_2':
                return res.status(409).json({
                    success: false,
                    message: 'No se puede eliminar porque está siendo referenciado',
                    error: 'REFERENCED_ROW'
                });
            
            case 'ECONNREFUSED':
                return res.status(500).json({
                    success: false,
                    message: 'Error de conexión a la base de datos',
                    error: 'DATABASE_CONNECTION'
                });
            
            default:
                return res.status(500).json({
                    success: false,
                    message: 'Error de base de datos',
                    error: err.code
                });
        }
    }

    if (err.message) {
        const statusCode = err.statusCode || 400;
        return res.status(statusCode).json({
            success: false,
            message: err.message
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
    });
}

function notFound(req, res) {
    res.status(404).json({
        success: false,
        message: `Ruta ${req.method} ${req.path} no encontrada`
    });
}

module.exports = { errorHandler, notFound };